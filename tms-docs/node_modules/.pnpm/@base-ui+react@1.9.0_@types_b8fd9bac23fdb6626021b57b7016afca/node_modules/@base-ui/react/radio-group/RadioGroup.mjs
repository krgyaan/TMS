'use client';

import * as React from 'react';
import { useControlled } from '@base-ui/utils/useControlled';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { useMergedRefs } from '@base-ui/utils/useMergedRefs';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { useBaseUiId } from "../internals/useBaseUiId.mjs";
import { contains } from "../floating-ui-react/utils.mjs";
import { SHIFT } from "../internals/composite/composite.mjs";
import { CompositeRoot } from "../internals/composite/root/CompositeRoot.mjs";
import { useFieldRootContext } from "../internals/field-root-context/FieldRootContext.mjs";
import { useRegisterFieldControl } from "../internals/field-register-control/useRegisterFieldControl.mjs";
import { fieldValidityMapping } from "../internals/field-constants/constants.mjs";
import { isEligibleInput } from "../field/root/useFieldValidation.mjs";
import { useFieldsetRootContext } from "../fieldset/root/FieldsetRootContext.mjs";
import { useFormContext } from "../internals/form-context/FormContext.mjs";
import { useLabelableContext } from "../internals/labelable-provider/LabelableContext.mjs";
import { useValueChanged } from "../internals/useValueChanged.mjs";
import { RadioGroupContext } from "./RadioGroupContext.mjs";
import { jsx as _jsx } from "react/jsx-runtime";
const MODIFIER_KEYS = [SHIFT];

/**
 * Provides shared state to a series of radio buttons.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Radio Group](https://base-ui.com/react/components/radio-group)
 */
export const RadioGroup = /*#__PURE__*/React.forwardRef(function RadioGroup(componentProps, forwardedRef) {
  const {
    render,
    className,
    disabled: disabledProp,
    readOnly,
    required,
    onValueChange: onValueChangeProp,
    value: externalValue,
    defaultValue,
    form,
    name: nameProp,
    inputRef: inputRefProp,
    id: idProp,
    style,
    ...elementProps
  } = componentProps;
  const {
    setTouched: setFieldTouched,
    setFocused,
    validationMode,
    name: fieldName,
    disabled: fieldDisabled,
    state: fieldState,
    validation,
    setDirty,
    setFilled,
    validityData
  } = useFieldRootContext();
  const {
    labelId
  } = useLabelableContext();
  const {
    clearErrors,
    elementRef
  } = useFormContext();
  const fieldsetContext = useFieldsetRootContext(true);
  const disabled = fieldDisabled || disabledProp;
  const name = fieldName ?? nameProp;
  const id = useBaseUiId(idProp);
  const [checkedValue, setCheckedValueUnwrapped] = useControlled({
    controlled: externalValue,
    default: defaultValue,
    name: 'RadioGroup',
    state: 'value'
  });
  const [touched, setTouched] = React.useState(false);
  const setCheckedValue = useStableCallback((value, eventDetails) => {
    onValueChangeProp?.(value, eventDetails);
    if (eventDetails.isCanceled) {
      return;
    }
    setCheckedValueUnwrapped(value);
  });
  const getInputControl = validation.getInputControl;
  const controlRef = React.useMemo(() => ({
    get current() {
      return getInputControl();
    }
  }), [getInputControl]);
  const groupInputRef = React.useRef(null);
  const firstEnabledInputRef = React.useRef(null);
  const mergedInputRef = useMergedRefs(groupInputRef, inputRefProp);
  const lastAppliedInputRef = React.useRef(mergedInputRef);

  // Only forwards the public `inputRef` and tracks the current representative for that forwarding.
  // The registry (`validation.registeredInputs`) is authoritative for validation and form-value
  // projection, so the group must not write `validation.inputRef`: a stale, unmounted radio left
  // there would become the Field's fallback once the registry empties and keep blocking submission.
  const setInputRef = useStableCallback(hiddenInput => {
    if (groupInputRef.current === hiddenInput && lastAppliedInputRef.current === mergedInputRef) {
      return;
    }
    lastAppliedInputRef.current = mergedInputRef;
    void mergedInputRef?.(hiddenInput);
  });
  useIsoLayoutEffect(() => {
    setInputRef(groupInputRef.current);
  }, [mergedInputRef, setInputRef]);
  const registerInputRef = useStableCallback(input => {
    if (!input) {
      return undefined;
    }
    if (!input.disabled) {
      if (!firstEnabledInputRef.current) {
        firstEnabledInputRef.current = input;
      }
      const currentInput = groupInputRef.current;
      if (input.checked || currentInput == null || currentInput.disabled) {
        setInputRef(input);
      }
    }

    // Detach when this input unmounts while still forwarded, so consumers don't
    // keep holding a disconnected node. The input may have become the forwarded
    // one after attach (via the re-registration effect), so always return this.
    return () => {
      if (firstEnabledInputRef.current === input) {
        firstEnabledInputRef.current = null;
      }
      if (groupInputRef.current === input) {
        setInputRef(null);
      }
    };
  });
  const getFormValue = useStableCallback(() => {
    const formElement = elementRef.current;
    if (!formElement) {
      return checkedValue ?? null;
    }
    for (const input of validation.registeredInputs.keys()) {
      if (input.checked && isEligibleInput(input, formElement)) {
        return checkedValue ?? null;
      }
    }
    return null;
  });
  useRegisterFieldControl(controlRef, id, checkedValue ?? null, getFormValue, !disabled, nameProp);
  useValueChanged(checkedValue, () => {
    clearErrors(name);
    setDirty(checkedValue !== validityData.initialValue);
    setFilled(checkedValue != null);
    validation.change(checkedValue);
    const fallbackInput = firstEnabledInputRef.current;
    if (checkedValue == null && fallbackInput && !fallbackInput.disabled) {
      setInputRef(fallbackInput);
    }
  });
  const ariaLabelledby = labelId ?? fieldsetContext?.legendId;
  const state = {
    ...fieldState,
    disabled: disabled ?? false,
    required: required ?? false,
    readOnly: readOnly ?? false
  };
  const contextValue = React.useMemo(() => ({
    checkedValue,
    disabled,
    form,
    validation,
    name,
    readOnly,
    registerInputRef,
    required,
    setCheckedValue,
    setTouched,
    touched
  }), [checkedValue, disabled, form, validation, name, readOnly, registerInputRef, required, setCheckedValue, setTouched, touched]);
  const defaultProps = {
    id: idProp,
    role: 'radiogroup',
    'aria-required': required || undefined,
    'aria-disabled': disabled || undefined,
    'aria-readonly': readOnly || undefined,
    'aria-labelledby': ariaLabelledby,
    onBlur(event) {
      if (!contains(event.currentTarget, event.relatedTarget)) {
        setTouched(false);
        setFieldTouched(true);
        setFocused(false);
        if (validationMode === 'onBlur') {
          validation.commit(checkedValue);
        }
      }
    },
    onKeyDownCapture(event) {
      if (event.key.startsWith('Arrow')) {
        setTouched(true);
      }
    }
  };
  return /*#__PURE__*/_jsx(RadioGroupContext.Provider, {
    value: contextValue,
    children: /*#__PURE__*/_jsx(CompositeRoot, {
      render: render,
      className: className,
      style: style,
      state: state,
      props: [defaultProps, elementProps, props => validation.getValidationProps(disabled ?? false, props)],
      refs: [forwardedRef],
      stateAttributesMapping: fieldValidityMapping,
      enableHomeAndEndKeys: false,
      modifierKeys: MODIFIER_KEYS
    })
  });
});
if (process.env.NODE_ENV !== "production") RadioGroup.displayName = "RadioGroup";