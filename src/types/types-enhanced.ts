import { Doctor } from './doctor';
import { Appointment } from './appointment';

export interface DoctorScore {
  doctor: Doctor;
  totalScore: number;
  breakdown: {
    availability: number;      // 35% weight
    distance: number;          // 30% weight
    skillMatch: number;        // 20% weight
    loadBalance: number;       // 10% weight
    performance: number;       // 5% weight
  };
  details: {
    distanceKm: number;
    estimatedMinutes: number;
    casesToday: number;
    canMeetGuarantee: boolean;
    reason: string;
  };
}

export interface AssignmentWeights {
  availability: number;
  distance: number;
  skillMatch: number;
  loadBalance: number;
  performance: number;
}

export interface DoctorWithStats extends Doctor {
  casesToday: number;
  averageRating: number;
  specialties: string[];
  hubLocation: string;
}

export const DEFAULT_WEIGHTS: AssignmentWeights = {
  availability: 0.35,
  distance: 0.30,
  skillMatch: 0.20,
  loadBalance: 0.10,
  performance: 0.05,
};

export const SERVICE_GUARANTEE_MINUTES = 30;
