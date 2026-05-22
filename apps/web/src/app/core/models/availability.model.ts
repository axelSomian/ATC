export interface AvailabilitySlot {
  id: string;
  userId: string;
  startsAt: string;
  endsAt: string;
  status: 'free' | 'busy' | 'matched';
}
