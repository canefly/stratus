export interface ParsedItem {
  id: number;
  meta: string;
  start: string;
  end: string | null;
  duration: number;
  isSingle: boolean;
  link: string;
  included: boolean;
  checked: boolean;
  syncId: number;
}

export interface ParsedNote {
  id: number;
  text: string;
}

export interface ParseResult {
  items: ParsedItem[];
  links: string[];
  notes: ParsedNote[];
  report: {
    count: number;
    warnings: string[];
  };
  htmlContent: string;
}
