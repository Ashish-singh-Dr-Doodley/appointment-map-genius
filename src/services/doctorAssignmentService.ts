import { Doctor } from '@/types/doctor';
import { Appointment } from '@/types/appointment';
import { 
  DoctorScore, 
  AssignmentWeights, 
  DEFAULT_WEIGHTS,
  SERVICE_GUARANTEE_MINUTES 
} from '@/types/types-enhanced';

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Estimate travel time (assuming 20 km/h average speed in city)
function estimateTravelTime(distanceKm: number): number {
  const avgSpeedKmh = 20;
  return Math.round((distanceKm / avgSpeedKmh) * 60);
}

export function calculateDoctorScores(
  appointment: Appointment,
  doctors: Doctor[],
  allAppointments: Appointment[],
  weights: AssignmentWeights = DEFAULT_WEIGHTS
): DoctorScore[] {
  if (!appointment.latitude || !appointment.longitude) {
    return [];
  }

  const scores: DoctorScore[] = [];

  for (const doctor of doctors) {
    // Calculate cases assigned today for this doctor
    const casesToday = allAppointments.filter(
      a => a.doctorName === doctor.name && a.visitDate === appointment.visitDate
    ).length;

    // Calculate distance if doctor has location
    let distanceKm = Infinity;
    let estimatedMinutes = Infinity;
    
    if (doctor.latitude && doctor.longitude) {
      distanceKm = calculateDistance(
        doctor.latitude,
        doctor.longitude,
        appointment.latitude,
        appointment.longitude
      );
      estimatedMinutes = estimateTravelTime(distanceKm);
    } else {
      // If doctor has no location, use a default distance
      distanceKm = 10;
      estimatedMinutes = 30;
    }

    const canMeetGuarantee = estimatedMinutes <= SERVICE_GUARANTEE_MINUTES;

    // Calculate individual scores (0-100)
    const availabilityScore = calculateAvailabilityScore(doctor, appointment, allAppointments);
    const distanceScore = calculateDistanceScore(distanceKm);
    const skillMatchScore = calculateSkillMatchScore(doctor, appointment);
    const loadBalanceScore = calculateLoadBalanceScore(casesToday, doctors.length);
    const performanceScore = calculatePerformanceScore(doctor);

    // Calculate weighted total
    const totalScore = 
      availabilityScore * weights.availability +
      distanceScore * weights.distance +
      skillMatchScore * weights.skillMatch +
      loadBalanceScore * weights.loadBalance +
      performanceScore * weights.performance;

    // Generate reason
    const reason = generateReason(distanceKm, casesToday, canMeetGuarantee, availabilityScore);

    scores.push({
      doctor,
      totalScore: Math.round(totalScore * 10) / 10,
      breakdown: {
        availability: Math.round(availabilityScore),
        distance: Math.round(distanceScore),
        skillMatch: Math.round(skillMatchScore),
        loadBalance: Math.round(loadBalanceScore),
        performance: Math.round(performanceScore),
      },
      details: {
        distanceKm: Math.round(distanceKm * 10) / 10,
        estimatedMinutes,
        casesToday,
        canMeetGuarantee,
        reason,
      },
    });
  }

  // Sort by total score descending
  return scores.sort((a, b) => b.totalScore - a.totalScore);
}

function calculateAvailabilityScore(
  doctor: Doctor,
  appointment: Appointment,
  allAppointments: Appointment[]
): number {
  // Check if doctor already has overlapping appointments
  const doctorAppointments = allAppointments.filter(
    a => a.doctorName === doctor.name && a.visitDate === appointment.visitDate
  );

  // If no appointments, fully available
  if (doctorAppointments.length === 0) return 100;

  // Reduce score based on number of existing appointments
  const maxCasesPerDay = 10;
  const utilizationRate = doctorAppointments.length / maxCasesPerDay;
  
  return Math.max(0, 100 - (utilizationRate * 100));
}

function calculateDistanceScore(distanceKm: number): number {
  // Max distance considered is 20km
  const maxDistance = 20;
  if (distanceKm >= maxDistance) return 0;
  
  // Linear decay from 100 to 0
  return Math.max(0, 100 - (distanceKm / maxDistance) * 100);
}

function calculateSkillMatchScore(doctor: Doctor, appointment: Appointment): number {
  // Check if doctor specialty matches pet type or issue
  if (!doctor.specialty) return 50; // Neutral score for generalists

  const specialty = doctor.specialty.toLowerCase();
  const petType = appointment.petType.toLowerCase();
  const issue = appointment.issue.toLowerCase();

  // Perfect match
  if (specialty.includes(petType) || specialty.includes('all')) return 100;
  
  // Check for issue-specific matching
  if (issue.includes('surgery') && specialty.includes('surgeon')) return 100;
  if (issue.includes('emergency') && specialty.includes('emergency')) return 100;
  if (issue.includes('vaccination') && specialty.includes('general')) return 90;

  // Default moderate match
  return 60;
}

function calculateLoadBalanceScore(casesToday: number, totalDoctors: number): number {
  // Lower cases = higher score for fair distribution
  const maxCasesPerDay = 10;
  return Math.max(0, 100 - (casesToday / maxCasesPerDay) * 100);
}

function calculatePerformanceScore(doctor: Doctor): number {
  // Since we don't have historical performance data, return default score
  // This can be enhanced with actual performance metrics
  return 75;
}

function generateReason(
  distanceKm: number,
  casesToday: number,
  canMeetGuarantee: boolean,
  availabilityScore: number
): string {
  if (distanceKm < 2 && availabilityScore > 80) {
    return "Closest available doctor";
  }
  if (casesToday === 0) {
    return "Fresh start, no cases today";
  }
  if (canMeetGuarantee && distanceKm < 5) {
    return "Nearby and can meet 30-min guarantee";
  }
  if (availabilityScore > 90) {
    return "Highly available for assignments";
  }
  if (distanceKm < 3) {
    return "Very close to appointment location";
  }
  return "Available for assignment";
}

export function getTopDoctorSuggestions(
  appointment: Appointment,
  doctors: Doctor[],
  allAppointments: Appointment[],
  count: number = 3
): DoctorScore[] {
  const scores = calculateDoctorScores(appointment, doctors, allAppointments);
  return scores.slice(0, count);
}
