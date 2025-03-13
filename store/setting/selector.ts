import { useSettingStore } from './useSettingStore';

export const useSettingActions = () => useSettingStore((state) => state.actions);

export const useSettingTheme = () => useSettingStore((state) => state.theme);

export const useSettingIsHydrated = () => useSettingStore((state) => state.isHydrated);
