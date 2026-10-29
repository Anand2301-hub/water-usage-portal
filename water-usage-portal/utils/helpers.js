const DAY_MS = 24 * 60 * 60 * 1000;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const startOfDayUTC = (d) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const parseISODate = (str) =>
  typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(new Date(str))
    ? new Date(str + 'T00:00:00.000Z')
    : null;

// The browser sends its own local date (?today=YYYY-MM-DD) so "today" is correct
// for the user's time zone. It is accepted only if within 2 days of server time.
const getToday = (req) => {
  const serverToday = startOfDayUTC(new Date());
  const supplied = parseISODate(req.query.today);
  if (supplied && Math.abs(supplied - serverToday) <= 2 * DAY_MS) return supplied;
  return serverToday;
};

// Builds the MongoDB filter used by the history list, totals and CSV export.
const buildUsageFilter = (userId, query) => {
  const filter = { userId };
  const { category, from, to, q } = query;
  if (category) filter.category = category;
  if (from || to) {
    filter.usageDate = {};
    if (from) filter.usageDate.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setUTCHours(23, 59, 59, 999);
      filter.usageDate.$lte = end;
    }
  }
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).slice(0, 50)), 'i');
    filter.$or = [{ notes: rx }, { category: rx }];
  }
  return filter;
};

// CSV cell escaping + protection against spreadsheet formula injection
const csvCell = (value) => {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
};

module.exports = { DAY_MS, escapeRegex, startOfDayUTC, parseISODate, getToday, buildUsageFilter, csvCell };
