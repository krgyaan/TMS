"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useItemRegistry = useItemRegistry;
var React = _interopRequireWildcard(require("react"));
var _useIsoLayoutEffect = require("@base-ui/utils/useIsoLayoutEffect");
var _useRefWithInit = require("@base-ui/utils/useRefWithInit");
var _useStableCallback = require("@base-ui/utils/useStableCallback");
/**
 * Collects item registrations into one immutable snapshot per React commit.
 * Also returns the live registry for reads that must include the registrations of the current
 * commit before its snapshot is published.
 */
function useItemRegistry() {
  const itemRegistry = (0, _useRefWithInit.useRefWithInit)(() => new Map()).current;
  const [registryVersion, setRegistryVersion] = React.useState(0);
  const isUpdateScheduledRef = React.useRef(false);

  // Item effects can run without their parent rendering. Schedule one synchronous parent
  // update for the whole commit so every registration is included in the next snapshot.
  const scheduleRegistryUpdate = (0, _useStableCallback.useStableCallback)(() => {
    if (isUpdateScheduledRef.current) {
      return;
    }
    isUpdateScheduledRef.current = true;
    setRegistryVersion(version => version + 1);
  });
  const registerItem = (0, _useStableCallback.useStableCallback)((key, item) => {
    itemRegistry.set(key, item);
    scheduleRegistryUpdate();
    return () => {
      itemRegistry.delete(key);
      scheduleRegistryUpdate();
    };
  });
  const registeredItems = React.useMemo(() => new Map(itemRegistry),
  // The mutable registry is stable. Its version explicitly controls when to publish a copy.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [registryVersion]);
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    isUpdateScheduledRef.current = false;
  }, [registryVersion]);
  return {
    items: registeredItems,
    registerItem,
    liveItems: itemRegistry
  };
}