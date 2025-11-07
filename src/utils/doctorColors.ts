// Predefined color palette for doctors
export const DOCTOR_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
];

// Get a consistent color for a doctor name
export const getDoctorColor = (doctorName: string, allDoctorNames: string[]): string => {
  const index = allDoctorNames.indexOf(doctorName);
  if (index === -1) return '#3b82f6'; // Default blue
  return DOCTOR_COLORS[index % DOCTOR_COLORS.length];
};

// Get all unique doctor names from appointments
export const getUniqueDoctorNames = (appointments: any[]): string[] => {
  const names = new Set<string>();
  appointments.forEach(apt => {
    if (apt.doctorName) {
      names.add(apt.doctorName);
    }
  });
  return Array.from(names).sort();
};
