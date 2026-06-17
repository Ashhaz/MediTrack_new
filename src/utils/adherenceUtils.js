import { isDoseAfterMedicineCreation, isMedicineScheduledOnDate, getTodayKey } from "./medicineUtils";

/**
 * Calculates the adherence percentage for the last 7 days.
 * Formula: (Taken doses / Scheduled doses) * 100
 * 
 * @param {Array} medicineList - List of all medicines
 * @returns {number} - Percentage (0-100)
 */
export const calculateWeeklyAdherence = (medicineList) => {
  const activeMeds = medicineList.filter(m => !m.archived);
  let totalScheduled = 0;
  let totalTaken = 0;

  // Iterate through the last 7 days (Today back to 6 days ago)
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = getTodayKey(date);

    activeMeds.forEach(med => {
      // Check if the medicine was active and scheduled on this specific date
      if (isMedicineScheduledOnDate(med, date)) {
        const schedule = med.scheduleTimes || [];

        // Check adherence history for each scheduled time slot
        schedule.forEach(time => {
          if (!isDoseAfterMedicineCreation(med, dateKey, time)) return;

          totalScheduled++;

          const isTaken = (med.adherenceHistory || []).some(
            h => h.date === dateKey && h.time === time && h.status === "Taken"
          );
          if (isTaken) totalTaken++;
        });
      }
    });
  }

  if (totalScheduled === 0) return null;
  return Math.round((totalTaken / totalScheduled) * 100);
};
