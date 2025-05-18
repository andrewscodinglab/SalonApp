import { analytics } from './firebase';
import { logEvent } from 'firebase/analytics';

export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (analytics) {
    logEvent(analytics, eventName, eventParams);
  }
};

export const AnalyticsEvents = {
  BOOKING_STARTED: 'booking_started',
  BOOKING_COMPLETED: 'booking_completed',
  SERVICE_SELECTED: 'service_selected',
  STYLIST_VIEWED: 'stylist_viewed',
  AVAILABILITY_CHECKED: 'availability_checked',
} as const; 