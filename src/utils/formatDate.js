import { format, isToday, isYesterday } from "date-fns";

export function formatChatDate(date) {
  if (!date) return "";

  if (isToday(date)) {
    return "Today at " + format(date, "hh:mm a");
  }
  if (isYesterday(date)) {
    return "Yesterday at " + format(date, "hh:mm a");
  }

  return format(date, "dd MMM yyyy, hh:mm a");
}
