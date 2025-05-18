export const styles = {
  card: "bg-background-card rounded-card shadow-card p-card-padding",
  input: "w-full rounded-input border-gray-300 shadow-input focus:border-gold focus:ring-gold",
  button: {
    primary: "bg-gold hover:bg-gold-dark text-white font-medium py-3 px-6 rounded-button shadow-button transition-colors",
    secondary: "bg-white hover:bg-gray-50 text-text border border-gray-300 font-medium py-3 px-6 rounded-button shadow-button transition-colors",
    outline: "bg-transparent hover:bg-gold/5 text-gold border border-gold font-medium py-3 px-6 rounded-button transition-colors",
  },
  heading: {
    h1: "text-heading-1 text-text mb-6",
    h2: "text-heading-2 text-text mb-4",
  },
  text: {
    body: "text-body text-text",
    secondary: "text-body text-text-secondary",
    caption: "text-caption text-text-light",
  },
  badge: {
    pending: "bg-status-pending/10 text-status-pending px-3 py-1 rounded-full text-sm font-medium",
    confirmed: "bg-status-confirmed/10 text-status-confirmed px-3 py-1 rounded-full text-sm font-medium",
    cancelled: "bg-status-cancelled/10 text-status-cancelled px-3 py-1 rounded-full text-sm font-medium",
  },
} as const; 