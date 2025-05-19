import React, { useState, useEffect } from 'react';
import { format, addDays, isAfter, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { getStylistSchedule } from '@/lib/stylistService';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TimeSlot, WeeklySchedule } from '@/types/stylist';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';

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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DateTimeSelector({ stylistId, selectedService, onChange, value }: DateTimeSelectorProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<AvailableTimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule | null>(null);
  const [exceptions, setExceptions] = useState<Array<{ date: string }>>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  // Get calendar days for current month view
  const calendarDays = React.useMemo(() => {
    if (!weeklySchedule) return [];

    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Add days from previous month to start on Sunday
    const startDay = start.getDay();
    if (startDay > 0) {
      const previousDays = Array.from({ length: startDay }, (_, i) => {
        return addDays(start, -(startDay - i));
      });
      days.unshift(...previousDays);
    }

    // Add days from next month to end on Saturday
    const endDay = end.getDay();
    if (endDay < 6) {
      const nextDays = Array.from({ length: 6 - endDay }, (_, i) => {
        return addDays(end, i + 1);
      });
      days.push(...nextDays);
    }

    return days;
  }, [currentMonth, weeklySchedule]);

  // Check if a date is available
  const isDateAvailable = (date: Date): boolean => {
    if (!weeklySchedule) return false;

    const dayName = DAYS[date.getDay()];
    const daySchedule = weeklySchedule[dayName];
    const dateStr = format(date, 'yyyy-MM-dd');

    // Check if date is in exceptions
    const isException = exceptions.some(ex => ex.date === dateStr);
    if (isException) return false;

    // Check if day is enabled and has slots
    return daySchedule?.enabled && daySchedule.slots.length > 0;
  };

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
          numberOfPossibleSlots: Math.floor((slotEndMinutes - slotStartMinutes) / duration),
          startTime: `${Math.floor(slotStartMinutes / 60)}:${slotStartMinutes % 60}`,
          endTime: `${Math.floor(slotEndMinutes / 60)}:${slotEndMinutes % 60}`
        });

        // Check intervals based on service duration
        for (let minutes = slotStartMinutes; minutes <= slotEndMinutes - duration; minutes += duration) {
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
            displayTime: format(slotTime, 'h:mm a')
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
  const handleDateChange = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    setSelectedTime('');
    loadTimeSlots(dateStr);
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

  if (loading && !calendarDays.length) {
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
    <div className="space-y-6">
      {!selectedService && (
        <div className="flex items-center gap-3 p-4 bg-[#FFF9E5] rounded-lg border border-[#D4AF37]/20">
          <Info className="w-5 h-5 text-[#D4AF37]" />
          <p className="text-[#946C00] font-medium">
            Please select a service to view available dates and times
          </p>
        </div>
      )}
      {selectedService && (
        <>
          {/* Calendar View */}
          <div className="rounded-lg border border-gray-200">
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <button
                onClick={() => setCurrentMonth(prev => addDays(prev, -30))}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="font-medium">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <button
                onClick={() => setCurrentMonth(prev => addDays(prev, 30))}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {WEEKDAYS.map(day => (
                <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {calendarDays.map((day, index) => {
                const isAvailable = isDateAvailable(day);
                const isSelected = selectedDate === format(day, 'yyyy-MM-dd');
                const isCurrentMonth = isSameMonth(day, currentMonth);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => isAvailable && handleDateChange(day)}
                    disabled={!isAvailable}
                    className={`
                      p-4 text-center bg-white hover:bg-gray-50 transition-colors relative
                      ${!isCurrentMonth ? 'text-gray-400' : ''}
                      ${isSelected ? 'bg-[#D4AF37]/10 font-medium' : ''}
                      ${isToday(day) ? 'font-bold' : ''}
                      ${!isAvailable ? 'cursor-not-allowed bg-gray-50 text-gray-400' : ''}
                    `}
                  >
                    <span className="relative z-10">
                      {format(day, 'd')}
                    </span>
                    {isAvailable && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                        <div className="w-1 h-1 bg-[#D4AF37] rounded-full"></div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div>
              <h4 className="font-medium mb-3">Available Times</h4>
              {loading ? (
                <div className="text-sm text-gray-500">Loading available times...</div>
              ) : availableTimeSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableTimeSlots.map((slot, index) => (
                    <button
                      key={`${slot.startTime}-${index}`}
                      onClick={() => handleTimeChange(slot.startTime)}
                      className={`
                        p-3 text-center border rounded-md transition-colors
                        ${selectedTime === slot.startTime
                          ? 'border-[#D4AF37] bg-[#D4AF37]/5 text-[#D4AF37]'
                          : 'border-gray-200 hover:border-[#D4AF37]/50'
                        }
                      `}
                    >
                      <div>{slot.displayTime}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {selectedService.duration} min
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-600 p-4 bg-gray-50 rounded-md">
                  No available time slots for this date
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
} 