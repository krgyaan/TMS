import * as React from 'react';
import type { FieldValidityData, FieldRootState } from "../../field/root/FieldRoot.mjs";
import type { Form } from "../../form/index.mjs";
import type { UseFieldValidationReturnValue } from "../../field/root/useFieldValidation.mjs";
import type { FieldControlRegistration } from "../field-register-control/useFieldControlRegistration.mjs";
export interface FieldRootContext {
  invalid: boolean | undefined;
  name: string | undefined;
  validityData: FieldValidityData;
  setValidityData: React.Dispatch<React.SetStateAction<FieldValidityData>>;
  disabled: boolean | undefined;
  setTouched: React.Dispatch<React.SetStateAction<boolean>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  setFilled: React.Dispatch<React.SetStateAction<boolean>>;
  setFocused: React.Dispatch<React.SetStateAction<boolean>>;
  /**
   * Identifies the control the focused state belongs to, so that disabling or unmounting a
   * different control in the same field can't clear it. Written through `useSetFieldFocused`.
   */
  focusOwnerRef: React.RefObject<unknown>;
  validationMode: Form.ValidationMode;
  shouldValidateOnChange: () => boolean;
  state: FieldRootState;
  registerFieldControl: (source: symbol, registration: FieldControlRegistration | undefined) => void;
  validation: UseFieldValidationReturnValue;
}
export declare const DEFAULT_FIELD_ROOT_CONTEXT: FieldRootContext;
export declare const FieldRootContext: React.Context<FieldRootContext>;
export declare function useFieldRootContext(optional?: boolean): FieldRootContext;