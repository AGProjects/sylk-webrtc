export interface DnsResponse {
  Status: number;
  TC: boolean;
  RD: boolean;
  RA: boolean;
  AD: boolean;
  CD: boolean;

  Question: DnsQuestion[];

  Answer?: DnsRecord[];
  Authority?: DnsRecord[];
  Additional?: DnsRecord[];

  Comment?: string;
}

export interface DnsQuestion {
  name: string;
  type: number;
}

export interface DnsRecord {
  name: string;
  type: number;
  TTL: number;
  data: string;
}
