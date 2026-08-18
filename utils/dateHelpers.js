/**
 * Date Utilities for Contract Portal
 * Provides single source of truth for date calculations and formatting
 */

/**
 * Adds a preparation period string (e.g. "1 week", "2 weeks", "0 days") to a start date
 */
function addPreparationPeriod(startDateInput, prepPeriodStr) {
  const date = new Date(startDateInput);
  if (isNaN(date.getTime())) return new Date();

  const text = (prepPeriodStr || '1 week').trim().toLowerCase();
  const weekMatch = text.match(/(\d+)\s*(?:week|wk|w)/);
  const dayMatch = text.match(/(\d+)\s*(?:day|d)/);
  const monthMatch = text.match(/(\d+)\s*(?:month|mo|m)/);

  if (weekMatch) {
    date.setDate(date.getDate() + (parseInt(weekMatch[1], 10) * 7));
  } else if (dayMatch) {
    date.setDate(date.getDate() + parseInt(dayMatch[1], 10));
  } else if (monthMatch) {
    date.setMonth(date.getMonth() + parseInt(monthMatch[1], 10));
  } else if (text.includes('none') || text.includes('0')) {
    // 0 preparation period
  } else {
    date.setDate(date.getDate() + 7);
  }

  return date;
}

/**
 * Calculates end date by adding a duration string (e.g. "1 Month", "3 Months", "1 Year", "2 Weeks") to a start date
 */
function calculateEndDate(startDateInput, timePeriodStr) {
  const startDate = new Date(startDateInput);
  if (isNaN(startDate.getTime())) return new Date().toISOString();

  const endDate = new Date(startDate);
  const text = (timePeriodStr || '').trim().toLowerCase();

  const yearMatch = text.match(/(\d+)\s*(?:year|yr|y)/);
  const monthMatch = text.match(/(\d+)\s*(?:month|mo|m)/);
  const weekMatch = text.match(/(\d+)\s*(?:week|wk|w)/);
  const dayMatch = text.match(/(\d+)\s*(?:day|d)/);

  if (yearMatch) {
    endDate.setFullYear(endDate.getFullYear() + parseInt(yearMatch[1], 10));
  } else if (monthMatch) {
    endDate.setMonth(endDate.getMonth() + parseInt(monthMatch[1], 10));
  } else if (weekMatch) {
    endDate.setDate(endDate.getDate() + (parseInt(weekMatch[1], 10) * 7));
  } else if (dayMatch) {
    endDate.setDate(endDate.getDate() + parseInt(dayMatch[1], 10));
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  return endDate.toISOString();
}

/**
 * Formats a date object/string for contract text (e.g. "19 August 2026")
 */
function formatDateFormatted(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

module.exports = {
  addPreparationPeriod,
  calculateEndDate,
  formatDateFormatted
};
