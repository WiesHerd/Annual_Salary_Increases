declare module 'json-logic-js' {
  interface JsonLogicAPI {
    apply(logic: unknown, data: unknown): unknown;
    truthy(val: unknown): boolean;
  }
  const jsonLogic: JsonLogicAPI;
  export default jsonLogic;
}
