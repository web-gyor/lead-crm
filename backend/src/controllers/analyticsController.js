const { pool } = require('../config/db');

/**
 * Business Intelligence & Analytics Controller
 * Generates KPIs, growth trends, and conversion funnel data.
 */
exports.getBusinessOverview = async (req, res) => {
  try {
    // We execute all queries in parallel to reduce dashboard loading time
    const [
      performanceResult,
      trendResult,
      funnelResult,
      courseResult
    ] = await Promise.all([
      // 1. Daily Performance Metrics
      pool.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN DATE(first_contacted_at) = CURDATE() THEN 1 ELSE 0 END), 0) as callsMadeToday,
          COALESCE(SUM(CASE WHEN DATE(updated_at) = CURDATE() THEN 1 ELSE 0 END), 0) as leadsHandledToday
        FROM leads
      `),

      // 2. 6-Month Lead & Admission Growth Trend
      pool.query(`
        SELECT 
          DATE_FORMAT(created_at, '%b %Y') as month,
          COUNT(*) as totalLeads,
          SUM(CASE WHEN lead_status = 'Converted' THEN 1 ELSE 0 END) as admissions
        FROM leads
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY month
        ORDER BY MIN(created_at) ASC
      `),

      // 3. Master Conversion Funnel
      pool.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN lead_status IN ('Contacted', 'Interested', 'Follow-up', 'Converted') THEN 1 ELSE 0 END) as contacted,
          SUM(CASE WHEN lead_status = 'Converted' THEN 1 ELSE 0 END) as converted,
          SUM(CASE WHEN lead_status IN ('Lost', 'Not Interested') THEN 1 ELSE 0 END) as lost
        FROM leads
      `),

      // 4. Course Distribution Data
      pool.query(`
        SELECT 
          CASE 
            WHEN interested_course IS NULL OR interested_course = '' THEN 'General Inquiry' 
            ELSE interested_course 
          END as name, 
          COUNT(*) as value 
        FROM leads 
        GROUP BY name 
        ORDER BY value DESC 
        LIMIT 8
      `)
    ]);

    // Data Extraction
    const perf = performanceResult[0][0];
    const trendRows = trendResult[0];
    const f = funnelResult[0][0];
    const courseRows = courseResult[0];

    return res.status(200).json({
      success: true,
      dailyPerformance: {
        callsMade: perf.callsMadeToday,
        handled: perf.leadsHandledToday
      },
      trends: trendRows,
      courses: courseRows,
      funnel: {
        total: f.total || 0,
        engaged: f.contacted || 0, // Mapped for frontend chart consistency
        closed: f.converted || 0,  // Mapped for frontend chart consistency
        lost: f.lost || 0,
        followUp: 0                // Reserved for future logic
      }
    });

  } catch (err) {
    console.error("AnalyticsController.getBusinessOverview Error:", err.message);
    return res.status(500).json({ 
      success: false, 
      error: "Analytics synchronization failed. Please try again later." 
    });
  }
};