export interface Service {
  id: string;
  stylistId: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
}

export interface Availability {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export interface ConsultationQuestion {
  id: string;
  text: string;
  type: 'text' | 'multiline' | 'multiple' | 'yesno';
  required: boolean;
  options?: string[];  // For multiple choice questions
}

export interface ConsultationForm {
  id: string;
  name: string;
  isDefault: boolean;
  questions: ConsultationQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  start: string;
  startPeriod: string;
  end: string;
  endPeriod: string;
  id: string;
}

export interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface StylistAvailability {
  exceptions: Array<{ date: string }>;
  lastUpdated: string;
  weeklySchedule: WeeklySchedule;
}

export interface Stylist {
  id: string;
  name: string;
  salonName?: string;
  profileImageUrl?: string;
  services?: Service[];
  consultationForm?: ConsultationForm;
  weeklySchedule?: WeeklySchedule;
  address?: string;
  phone?: string;
  email?: string;
} 