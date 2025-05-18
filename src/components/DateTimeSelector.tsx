import React, { useState, useEffect } from 'react';
import { format, addDays, isAfter } from 'date-fns';
import { getStylistSchedule } from '@/lib/stylistService';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TimeSlot, WeeklySchedule } from '@/types/stylist';

interface DateTimeSelectorProps {
  stylistId: string;
  selectedService?: { duration: number };
  onChange: (dateTime: string) => void;
  value?: string;
}

interface AvailableTimeSlot {
  startTime: string;
  displayTime: string;
}

// Map JavaScript's getDay() to our database days
const DAYS: Record<number, keyof WeeklySchedule> = {
  0: 'sunday',    // Sunday
  1: 'monday',    // Monday
  2: 'tuesday',   // Tuesday
  3: 'wednesday', // Wednesday
  4: 'thursday',  // Thursday
  5: 'friday',    // Friday
  6: 'saturday'   // Saturday
};

export default function DateTimeSelector({ stylistId, selectedService, onChange, value }: DateTimeSelectorProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<AvailableTimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule | null>(null);
  const [exceptions, setExceptions] = useState<Array<{ date: string }>>([]);

  // Convert 12-hour time to minutes since midnight
  const timeToMinutes = (time: string, period: string): number => {
    console.log('Converting time:', { time, period });
    
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    
    if (period.toUpperCase() === 'PM' && hours !== 12) {
      hour24 = hours + 12;
    } else if (period.toUpperCase() === 'AM' && hours === 12) {
      hour24 = 0;
    }
    
    const totalMinutes = hour24 * 60 + minutes;
    console.log('Converted to minutes:', { hours, minutes, hour24, totalMinutes });
    return totalMinutes;
  };

  // Get available dates (next 14 days, only enabled days with slots)
  const availableDates = React.useMemo(() => {
    if (!weeklySchedule) return [];

    const dates: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 14; i++) {
      const date = addDays(today, i);
      const dayOfWeek = date.getDay();
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Get the day name from our mapping
      const dayName = DAYS[dayOfWeek];
      const daySchedule = weeklySchedule[dayName];

      // Skip if day is disabled, in exceptions, or has no slots
      const isException = exceptions.some(ex => ex.date === dateStr);
      if (!daySchedule?.enabled || isException || !daySchedule?.slots?.length) {
        continue;
      }

      dates.push(dateStr);
    }

    return dates;
  }, [weeklySchedule, exceptions]);

  // Load available time slots for selected date
  const loadTimeSlots = async (date: string) => {
    if (!weeklySchedule || !selectedService) {
      console.log('Missing required data:', { weeklySchedule: !!weeklySchedule, selectedService: !!selectedService });
      setAvailableTimeSlots([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parse the date parts
      const [year, month, day] = date.split('-').map(Number);
      // Create date at noon to avoid timezone issues
      const selectedDateTime = new Date(year, month - 1, day, 12, 0, 0);
      const dayOfWeek = selectedDateTime.getDay();
      
      console.log('Loading time slots for:', {
        date,
        dayOfWeek,
        dayName: DAYS[dayOfWeek],
        selectedDateTime: selectedDateTime.toISOString(),
        selectedService
      });

      // Get the day name from our mapping
      const dayName = DAYS[dayOfWeek];
      const daySchedule = weeklySchedule[dayName];

      console.log('Found day schedule:', {
        dayName,
        enabled: daySchedule?.enabled,
        numberOfSlots: daySchedule?.slots?.length,
        slots: JSON.stringify(daySchedule?.slots, null, 2)
      });

      if (!daySchedule?.enabled || !daySchedule.slots.length) {
        console.log('Day is not enabled or has no slots');
        setAvailableTimeSlots([]);
        return;
      }

      // Check if date is in exceptions
      const isException = exceptions.some(ex => ex.date === date);
      if (isException) {
        console.log('Date is in exceptions');
        setAvailableTimeSlots([]);
        return;
      }

      // Get existing appointments for this date
      const startOfDay = new Date(year, month - 1, day);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day);
      endOfDay.setHours(23, 59, 59, 999);

      const appointmentsRef = collection(db, 'appointments');
      const appointmentsQuery = query(
        appointmentsRef,
        where('stylistId', '==', stylistId),
        where('status', '==', 'Scheduled'),
        where('dateTime', '>=', Timestamp.fromDate(startOfDay)),
        where('dateTime', '<=', Timestamp.fromDate(endOfDay))
      );

      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const existingAppointments = appointmentsSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            startTime: data.dateTime.toDate(),
            duration: data.duration
          };
        })
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      console.log('Existing appointments:', existingAppointments);

      const availableSlots: AvailableTimeSlot[] = [];
      const duration = selectedService.duration;
      const now = new Date();

      // Process each slot in the day's schedule
      for (const slot of daySchedule.slots) {
        console.log('\nProcessing slot:', {
          slot: JSON.stringify(slot, null, 2),
          start: slot.start,
          startPeriod: slot.startPeriod,
          end: slot.end,
          endPeriod: slot.endPeriod
        });

        const slotStartMinutes = timeToMinutes(slot.start, slot.startPeriod);
        const slotEndMinutes = timeToMinutes(slot.end, slot.endPeriod);

        console.log('Slot time range:', {
          startMinutes: slotStartMinutes,
          endMinutes: slotEndMinutes,
          duration,
          numberOfPossibleSlots: Math.floor((slotEndMinutes - slotStartMinutes) / 15),
          startTime: `${Math.floor(slotStartMinutes / 60)}:${slotStartMinutes % 60}`,
          endTime: `${Math.floor(slotEndMinutes / 60)}:${slotEndMinutes % 60}`
        });

        // Check every 15-minute interval
        for (let minutes = slotStartMinutes; minutes <= slotEndMinutes - duration; minutes += 15) {
          const slotTime = new Date(year, month - 1, day);
          slotTime.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

          // Skip if slot is in the past
          if (isAfter(now, slotTime)) {
            console.log('Skipping past slot:', format(slotTime, 'h:mm a'));
            continue;
          }

          const slotEndTime = new Date(slotTime.getTime() + duration * 60000);

          // Check if this slot overlaps with any existing appointments
          const hasOverlap = existingAppointments.some(appointment => {
            const appointmentEndTime = new Date(
              appointment.startTime.getTime() + appointment.duration * 60000
            );
            return (
              (slotTime >= appointment.startTime && slotTime < appointmentEndTime) ||
              (slotEndTime > appointment.startTime && slotEndTime <= appointmentEndTime) ||
              (slotTime <= appointment.startTime && slotEndTime >= appointmentEndTime)
            );
          });

          if (hasOverlap) {
            console.log('Skipping overlapping slot:', format(slotTime, 'h:mm a'));
            continue;
          }

          console.log('Adding available slot:', {
            start: format(slotTime, 'h:mm a'),
            end: format(slotEndTime, 'h:mm a'),
            minutes,
            slotStartMinutes,
            slotEndMinutes
          });

          availableSlots.push({
            startTime: format(slotTime, 'HH:mm'),
            displayTime: `${format(slotTime, 'h:mm a')} (${duration} min)`
          });
        }
      }

      console.log('Final available slots:', {
        count: availableSlots.length,
        slots: availableSlots
      });
      setAvailableTimeSlots(availableSlots);
    } catch (err) {
      console.error('Error loading time slots:', err);
      setError('Failed to load available time slots');
      setAvailableTimeSlots([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle date selection
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    loadTimeSlots(date);
  };

  // Handle time selection
  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    if (selectedDate && time) {
      onChange(`${selectedDate}T${time}`);
    }
  };

  // Initialize with current value if provided
  useEffect(() => {
    if (value) {
      const [date, time] = value.split('T');
      setSelectedDate(date);
      setSelectedTime(time);
      loadTimeSlots(date);
    }
  }, [value]);

  // Load stylist's schedule
  useEffect(() => {
    let mounted = true;
    
    const loadSchedule = async () => {
      try {
        const schedule = await getStylistSchedule(stylistId);
        
        if (!mounted) return;

        if (!schedule?.weeklySchedule) {
          throw new Error('Could not load stylist schedule');
        }

        setWeeklySchedule(schedule.weeklySchedule);
        setExceptions(schedule.exceptions || []);
        setError(null);
      } catch (err) {
        console.error('Error loading stylist schedule:', err);
        setError('Failed to load stylist schedule. Please try again later.');
        setWeeklySchedule(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSchedule();
    return () => { mounted = false; };
  }, [stylistId]);

  if (loading && !availableDates.length) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 p-4 bg-red-50 rounded-md">
        {error}
      </div>
    );
  }

  if (!weeklySchedule) {
    return (
      <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-md">
        No schedule available. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Date
        </label>
        {!selectedService ? (
          <div className="text-sm text-amber-600 p-4 bg-amber-50 rounded-md">
            Please select a service first to see available dates and times
          </div>
        ) : availableDates.length > 0 ? (
          <select
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-gold focus:border-gold bg-white"
          >
            <option value="">Select a date</option>
            {availableDates.map((date) => {
              // Parse the date and preserve the local date by setting hours to noon
              const [year, month, day] = date.split('-').map(Number);
              const displayDate = new Date(year, month - 1, day, 12, 0, 0);
              return (
                <option key={date} value={date}>
                  {format(displayDate, 'EEEE, MMMM d, yyyy')}
                </option>
              );
            })}
          </select>
        ) : (
          <div className="text-sm text-red-600 p-4 bg-red-50 rounded-md">
            No available dates in the next 14 days
          </div>
        )}
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Time
          </label>
          {loading ? (
            <div className="text-sm text-gray-500">Loading available times...</div>
          ) : availableTimeSlots.length > 0 ? (
            <select
              value={selectedTime}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-gold focus:border-gold bg-white"
            >
              <option value="">Select a time</option>
              {availableTimeSlots.map((slot, index) => (
                <option
                  key={`${slot.startTime}-${index}`}
                  value={slot.startTime}
                >
                  {slot.displayTime}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-sm text-red-600">
              No available time slots for this date
            </div>
          )}
        </div>
      )}
    </div>
  );
} 