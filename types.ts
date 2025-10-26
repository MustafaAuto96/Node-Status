
export interface NodeData {
  // FIX: Widened the index signature to include `boolean` and `undefined`.
  // The `isDuplicate` property is an optional boolean, which was not compatible
  // with the previous `string | number` type. This change makes the interface
  // correctly type all its properties, resolving the error on the 'isDuplicate' line.
  [key: string]: string | number | boolean | undefined;
  Node: string;
  Status: string;
  'IP Address': string;
  'Packet loss'?: string | number;
}
