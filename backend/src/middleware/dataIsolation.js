/**
 * AUTOMATED MULTI-TENANT SEPARATION LAYER
 * Restricts query visibility to match token payload scope parameters.
 */
const enforceDataIsolation = (req, res, next) => {
  if (!req.user) {
    return res.status(500).json({ 
      success: false, 
      error: "Data isolation module blocked—middleware execution lifecycle sequence broken" 
    });
  }

  // ─── TIER 1: GLOBAL OVERRIDE (SUPER ADMIN) ─────────────────────────────────
  if (req.user.is_super_admin) {
    // Super admins bypass isolation loops entirely, allowing cross-branch reporting queries
    req.branchFilter = {
      sqlClause: "1=1",
      bindings: [],
      rawBranchId: null
    };
    return next();
  }

  // ─── TIER 2: BRANCH BOUNDARY CONSTRAINT (ADMIN / STAFF) ────────────────────
  // Restricts data lookups strictly to the user's branch ID
  req.branchFilter = {
    sqlClause: "branch_id = ?",
    bindings: [req.user.branch_id],
    rawBranchId: req.user.branch_id
  };

  next();
};

module.exports = { enforceDataIsolation };