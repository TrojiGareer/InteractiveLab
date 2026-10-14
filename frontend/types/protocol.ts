export type ProtocolParameterDataType = "integer";

export type ProtocolParameter = {
  name: string;
  label: string;
  data_type: ProtocolParameterDataType;
  default: number;
  minimum: number;
  maximum: number;
  unit: string | null;
  description: string;
};

export type ProtocolDefinition = {
  id: string;
  name: string;
  description: string;
  parameters: ProtocolParameter[];
};

export type ProtocolListResponse = {
  items: ProtocolDefinition[];
};