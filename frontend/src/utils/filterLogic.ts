export const buildLeadQuery = (filters: any, page: number = 1, limit: number = 10) => {
  const queryParams: Record<string, string> = {
    page: page.toString(),
    limit: limit.toString(),
  };

  // 1. Search (Only if not empty)
  if (filters.search?.trim()) {
    queryParams.search = filters.search.trim();
  }

  // 2. Status & Source (IMPORTANT: Ignore empty strings to prevent 404)
  if (filters.status && filters.status !== "") {
    queryParams.status = filters.status;
  }
  
  if (filters.source && filters.source !== "") {
    queryParams.source = filters.source;
  }

  // 3. Date Range logic
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];

  switch (filters.range) {
    case "this_week":
      // Create a fresh copy to avoid mutating 'today'
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      queryParams.startDate = weekStart.toISOString().split('T')[0];
      queryParams.endDate = endDate;
      break;

    case "this_month":
      queryParams.startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString().split('T')[0];
      queryParams.endDate = endDate;
      break;

    case "this_year":
      queryParams.startDate = new Date(today.getFullYear(), 0, 1)
        .toISOString().split('T')[0];
      queryParams.endDate = endDate;
      break;

    case "custom":
      if (filters.startDate) queryParams.startDate = filters.startDate;
      if (filters.endDate) queryParams.endDate = filters.endDate;
      break;

    default:
      break;
  }

  return new URLSearchParams(queryParams).toString();
};