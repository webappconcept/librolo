"use client";

import { useState } from "react";

export function SettingToggle({
  name,
  label,
  description,
  defaultValue,
  activeColor = "bg-green-500",
}: {
  name: string;
  label: string;
  description: string;
  defaultValue: boolean;
  activeColor?: string;
}) {
  const [enabled, setEnabled] = useState(defaultValue);

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <input type="hidden" name={name} value={enabled ? "true" : "false"} />
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? activeColor : "bg-gray-200"
        }`}>
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
