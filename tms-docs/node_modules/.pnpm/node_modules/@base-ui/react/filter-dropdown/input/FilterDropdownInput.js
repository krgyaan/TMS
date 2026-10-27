"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FilterDropdownInput = void 0;
var React = _interopRequireWildcard(require("react"));
var _platform = require("@base-ui/utils/platform");
var _useRenderElement = require("../../internals/useRenderElement");
var _useBaseUiId = require("../../internals/useBaseUiId");
var _createBaseUIEventDetails = require("../../internals/createBaseUIEventDetails");
var _reasons = require("../../internals/reasons");
var _FilterDropdownRootContext = require("../root/FilterDropdownRootContext");
var _refocusOwner = require("../utils/refocusOwner");
/**
 * @internal
 */
const FilterDropdownInput = exports.FilterDropdownInput = /*#__PURE__*/React.forwardRef(function FilterDropdownInput(componentProps, forwardedRef) {
  const {
    render,
    className,
    style,
    id: idProp,
    disabled,
    activeItemId,
    navigationProps,
    ...elementProps
  } = componentProps;

  // Browsers flag a form field with neither an id nor a name.
  const id = (0, _useBaseUiId.useBaseUiId)(idProp);
  const context = (0, _FilterDropdownRootContext.useFilterDropdownRootContext)();
  const {
    listRef
  } = (0, _FilterDropdownRootContext.useFilterDropdownItemContext)();
  const value = (0, _FilterDropdownRootContext.useFilterDropdownValueContext)();

  // IME text isn't committed until the composition ends, so filtering waits for it.
  const [composingValue, setComposingValue] = React.useState(null);
  const isComposingRef = React.useRef(false);
  function commitValue(nextValue, nativeEvent) {
    // The input keeps focus until the popup unmounts. An edit made while it animates out would
    // land after the close reset the query and carry over into the next open.
    if (!context.open) {
      return;
    }
    const reason = nextValue === '' ? _reasons.REASONS.inputClear : _reasons.REASONS.inputChange;
    context.onValueChange(nextValue, (0, _createBaseUIEventDetails.createChangeEventDetails)(reason, nativeEvent));
  }
  const state = {
    highlighted: context.inputFocusVisible && (!context.keyboardModality || activeItemId == null)
  };
  return (0, _useRenderElement.useRenderElement)('input', componentProps, {
    state,
    ref: [forwardedRef, context.focusOwnerRef],
    props: [navigationProps, {
      id,
      type: 'text',
      disabled: context.disabled || disabled,
      'aria-activedescendant': activeItemId,
      role: 'searchbox',
      inputMode: 'search',
      autoComplete: 'off',
      spellCheck: 'false',
      autoCorrect: 'off',
      autoCapitalize: 'none',
      // The aria-autocomplete 'list' value is only valid with `aria-haspopup` so we depend
      // on the searchbox role to communicate affordance, with an input label as fallback
      // https://w3c.github.io/aria/#aria-autocomplete
      'aria-autocomplete': undefined,
      'aria-controls': context.listId,
      value: composingValue ?? value,
      onCompositionStart(event) {
        // Some Android keyboards treat all typing as one composition.
        if (_platform.platform.os.android) {
          return;
        }
        isComposingRef.current = true;
        setComposingValue(event.currentTarget.value);
      },
      onCompositionEnd(event) {
        if (!isComposingRef.current) {
          return;
        }
        isComposingRef.current = false;
        setComposingValue(null);
        commitValue(event.currentTarget.value, event.nativeEvent);
      },
      onChange(event) {
        if (isComposingRef.current) {
          setComposingValue(event.currentTarget.value);
          return;
        }
        commitValue(event.currentTarget.value, event.nativeEvent);
      },
      onKeyDown() {
        context.setKeyboardModality(true);
      },
      onPointerDown() {
        context.setKeyboardModality(false);
      },
      onMouseEnter(event) {
        context.setKeyboardModality(false);
        // Take focus so typing filters immediately.
        if (context.open) {
          (0, _refocusOwner.refocusOwner)(event.currentTarget);
        }
      },
      onFocus(event) {
        context.setInputFocusVisible(true);

        // A screen reader that followed `aria-activedescendant` put real focus on the item, so
        // focus returning from an item means the user moved back to the input on purpose and
        // the highlight no longer reflects where they are. The list's own key replay and
        // pointer refocus also pass through here and keep it.
        if (context.autoHighlight === 'always' || (0, _refocusOwner.isRefocusingOwner)()) {
          return;
        }
        const from = event.relatedTarget;
        if (from !== null && listRef.current.includes(from)) {
          context.setActiveIndex(null);
        }
      },
      onBlur() {
        context.setInputFocusVisible(false);
      }
    }, elementProps]
  });
});
if (process.env.NODE_ENV !== "production") FilterDropdownInput.displayName = "FilterDropdownInput";