export interface Appointment {
  id?: string;
  clientId: string;
  clientName: string;
  createdAt: Date;
  dateTime: Date;
  duration: number;
  notes: string;
  price: string;
  serviceIds: string[];
  serviceName: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Pending Payment';
  stylistId: string;
}

export interface BookingFormData {
  clientId: string;
  clientName: string;
  dateTime: string;
  duration: number;
  notes: string;
  price: string;
  serviceIds: string[];
  serviceName: string;
  stylistId: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Pending Payment';
} 