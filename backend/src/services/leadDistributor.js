const { pool } = require("../config/db");

class LeadDistributor {

  // ─────────────────────────────────────────────
  // MAIN DISTRIBUTION ENGINE
  // ─────────────────────────────────────────────
  async distribute(lead, assignedBy = null) {
    try {
      if (lead.is_archived || (lead.status && lead.status.toLowerCase() !== 'new' && lead.assigned_user_id !== null)) {
        return {
          success: false,
          reason: "Skipping distribution: Lead is either archived, already assigned, or not marked as 'new'",
        };
      }

      const counselors = await this.getEligibleCounselors();

      if (!counselors.length) {
        return {
          success: false,
          reason: "No eligible counselors available",
        };
      }

      let target = null;
      let mode = "round_robin";

      // 1. COUNTRY MATCHING (Study Abroad)
      if (lead.country) {
        const countryMatched = counselors.filter((c) => {
          try {
            const countries = c.country_specialization ? JSON.parse(c.country_specialization) : [];
            return (c.accepts_all_countries || countries.includes(lead.country));
          } catch (err) {
            console.error(`Invalid country JSON for counselor ${c.user_id}`);
            return false;
          }
        });

        if (countryMatched.length > 0) {
          target = this.getRoundRobinCounselor(countryMatched);
          mode = "country_based";
        }
      }

      // 2. COURSE MATCHING
      if (!target && lead.interested_course) {
        const courseMatched = counselors.filter((c) => {
          try {
            const courses = c.course_specialization ? JSON.parse(c.course_specialization) : [];
            return (c.accepts_all_courses || courses.includes(lead.interested_course));
          } catch (err) {
            console.error(`Invalid course JSON for counselor ${c.user_id}`);
            return false;
          }
        });

        if (courseMatched.length > 0) {
          target = this.getRoundRobinCounselor(courseMatched);
          mode = "course_based";
        }
      }

      // 3. GLOBAL ROUND ROBIN FALLBACK
      if (!target) {
        target = this.getRoundRobinCounselor(counselors);
        mode = "round_robin";
      }

      if (!target) {
        return {
          success: false,
          reason: "No counselor selected",
        };
      }

      const reason = `Automated assignment via ${mode}`;
      await this.executeAssignment(lead.id, target.user_id, mode, reason, assignedBy);

      return {
        success: true,
        assignedTo: target.user_id,
        counselor: target.name,
        mode,
      };

    } catch (err) {
      console.error("Lead distribution failed:", err);
      return {
        success: false,
        reason: err.message,
      };
    }
  }

  // ─────────────────────────────────────────────
  // GET ELIGIBLE COUNSELORS
  // ─────────────────────────────────────────────
  async getEligibleCounselors() {
    const [rows] = await pool.query(`
      SELECT *
      FROM counselor_distribution_rules
      WHERE is_active = 1
      AND assignment_mode != 'manual'
      AND (daily_limit = 0 OR daily_assigned_count < daily_limit)
      AND (max_active_leads = 0 OR active_lead_count < max_active_leads)
      ORDER BY priority_order ASC, last_assigned_at ASC
    `);
    return rows;
  }

  // ─────────────────────────────────────────────
  // ROUND ROBIN SELECTOR
  // ─────────────────────────────────────────────
  getRoundRobinCounselor(counselors) {
    if (!counselors.length) return null;
    return counselors.sort((a, b) => {
      const dateA = a.last_assigned_at ? new Date(a.last_assigned_at) : new Date(0);
      const dateB = b.last_assigned_at ? new Date(b.last_assigned_at) : new Date(0);
      return dateA.getTime() - dateB.getTime();
    })[0];
  }

  // ─────────────────────────────────────────────
  // EXECUTE ASSIGNMENT
  // ─────────────────────────────────────────────
  async executeAssignment(leadId, counselorId, mode, reason, assignedBy) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(`
        UPDATE leads
        SET assigned_user_id = ?, assignment_mode = ?, assignment_reason = ?, status = 'assigned', assigned_at = NOW()
        WHERE id = ?
      `, [counselorId, mode, reason, leadId]);

      await connection.query(`
        INSERT INTO lead_assignment_logs (lead_id, assigned_to, assignment_mode, assignment_reason, assigned_by)
        VALUES (?, ?, ?, ?, ?)
      `, [leadId, counselorId, mode, reason, assignedBy]);

      await connection.query(`
        UPDATE counselor_distribution_rules
        SET last_assigned_at = NOW(), daily_assigned_count = COALESCE(daily_assigned_count, 0) + 1, active_lead_count = COALESCE(active_lead_count, 0) + 1
        WHERE user_id = ?
      `, [counselorId]);

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      console.error("Assignment transaction failed:", err);
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = new LeadDistributor();