"use client";

import { format, parseISO } from "date-fns";
import { CalendarIcon, Clock3 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const fieldTriggerClass =
  "flex h-10 w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 text-sm transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50";

const placeholderClass = "text-slate-500";
const valueClass = "text-slate-100";

function formatDateLabel(value: string) {
  return format(parseISO(value), "dd/MM/yyyy");
}

function normalizeTimeValue(raw: string) {
  if (!raw) return "";
  const [hour = "", minute = ""] = raw.split(":");
  if (!hour || !minute) return "";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

type OptionalDateFieldProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  min?: string;
};

export function OptionalDateField({
  id,
  label,
  value,
  onChange,
  error,
  disabled = false,
  min,
}: OptionalDateFieldProps) {
  return (
    <div className="space-y-1.5">
      {label ? (
        <Label htmlFor={id} className="text-[10px] font-semibold text-slate-500">
          {label}
        </Label>
      ) : null}
      <div
        className={cn(
          "relative h-10 w-full",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <div
          className={cn(
            fieldTriggerClass,
            "pointer-events-none absolute inset-0",
            error && "border-red-500/50"
          )}
          aria-hidden="true"
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-slate-500" />
          <span className={value ? valueClass : placeholderClass}>
            {value ? formatDateLabel(value) : "--/--/----"}
          </span>
        </div>
        <input
          id={id}
          type="date"
          value={value}
          min={min}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "absolute inset-0 h-full w-full cursor-pointer opacity-0",
            "[color-scheme:dark]"
          )}
        />
      </div>
      {error ? <p className="text-[10px] font-medium text-red-400">{error}</p> : null}
    </div>
  );
}

type OptionalTimeFieldProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  step?: number;
};

export function OptionalTimeField({
  id,
  label,
  value,
  onChange,
  error,
  disabled = false,
  step = 900,
}: OptionalTimeFieldProps) {
  const displayValue = normalizeTimeValue(value);

  return (
    <div className="space-y-1.5">
      {label ? (
        <Label htmlFor={id} className="text-[10px] font-semibold text-slate-500">
          {label}
        </Label>
      ) : null}
      <div
        className={cn(
          "relative h-10 w-full",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <div
          className={cn(
            fieldTriggerClass,
            "pointer-events-none absolute inset-0",
            error && "border-red-500/50"
          )}
          aria-hidden="true"
        >
          <Clock3 className="h-4 w-4 shrink-0 text-slate-500" />
          <span className={displayValue ? valueClass : placeholderClass}>
            {displayValue || "--:--"}
          </span>
        </div>
        <input
          id={id}
          type="time"
          value={displayValue}
          step={step}
          disabled={disabled}
          onChange={(event) => onChange(normalizeTimeValue(event.target.value))}
          className={cn(
            "absolute inset-0 h-full w-full cursor-pointer opacity-0",
            "[color-scheme:dark]"
          )}
        />
      </div>
      {error ? <p className="text-[10px] font-medium text-red-400">{error}</p> : null}
    </div>
  );
}

type OptionalDateTimeFieldsProps = {
  dateId?: string;
  timeId?: string;
  dateLabel?: string;
  timeLabel?: string;
  dateValue: string;
  timeValue: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  dateError?: string;
  timeError?: string;
  disabled?: boolean;
  minDate?: string;
};

export function OptionalDateTimeFields({
  dateId,
  timeId,
  dateLabel = "Date *",
  timeLabel = "Time *",
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  dateError,
  timeError,
  disabled = false,
  minDate,
}: OptionalDateTimeFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <OptionalDateField
        id={dateId}
        label={dateLabel}
        value={dateValue}
        onChange={onDateChange}
        error={dateError}
        disabled={disabled}
        min={minDate}
      />
      <OptionalTimeField
        id={timeId}
        label={timeLabel}
        value={timeValue}
        onChange={onTimeChange}
        error={timeError}
        disabled={disabled}
      />
    </div>
  );
}
