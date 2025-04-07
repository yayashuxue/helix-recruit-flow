
export interface SequenceStep {
  id: string;
  title: string;
  content: string;
}

export interface Sequence {
  id: string;
  title: string;
  steps: SequenceStep[];
  createdAt?: string;
  updatedAt?: string;
}
