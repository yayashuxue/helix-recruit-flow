export interface SequenceStep {
  id: string;
  title: string;
  content: string;
  _highlight?: boolean;
}

export interface Sequence {
  id: string;
  title: string;
  steps: SequenceStep[];
  createdAt?: string;
  updatedAt?: string;
}
