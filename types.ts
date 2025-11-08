
export interface DurationOption {
  label: string;
  value: number; // Represents number of segments
  duration: number; // Approximate duration in seconds
}

// Extend window interface for aistudio properties
// FIX: Removed conflicting 'declare global' block for window.aistudio.
// This type is assumed to be provided by the execution environment, and re-declaring it causes type errors.
