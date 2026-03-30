# PhoneInput Component Documentation

## Description

The `PhoneInput` component is a phone number input that integrates the [intl-tel-input](https://github.com/jackocnr/intl-tel-input) library into your React/Next.js design system. It provides:

- ✅ Automatic international phone number validation
- 🌍 Country selector with flags
- 🎨 Full integration with the shadcn/ui design system
- 🔧 Automatic number formatting
- ♿ Full accessibility support
- 🌓 Dark mode support

## Installation

The component is already installed with the required dependencies:

```bash
npm install intl-tel-input
```

## Basic Usage

```tsx
import { PhoneInput } from "@/components/ui/phone-input"

function MyForm() {
  const [phone, setPhone] = useState('')
  const [isValid, setIsValid] = useState(true)

  return (
    <div className="space-y-2">
      <Label htmlFor="phone">Phone</Label>
      <PhoneInput
        id="phone"
        value={phone}
        onChange={setPhone}
        onValidation={setIsValid}
      />
      {!isValid && phone && (
        <p className="text-sm text-red-500">
          Please enter a valid number
        </p>
      )}
    </div>
  )
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `""` | Current phone number value |
| `onChange` | `(value: string) => void` | - | Callback fired when the value changes |
| `onValidation` | `(isValid: boolean) => void` | - | Callback for validation state |
| `className` | `string` | - | Additional CSS classes |
| `disabled` | `boolean` | `false` | Whether the field is disabled |
| ...props | `InputHTMLAttributes` | - | Other HTML input props |

## Features

### 🌍 Automatic country selection
The component starts with the "US" country code by default, but users can select any country in the world.

### 📱 Real-time validation
Validation runs automatically when the user types or changes the selected country.

### 🎨 Custom styling
A custom CSS file is included to blend intl-tel-input into the design system:
- Custom CSS variables for colors
- Dark mode support
- Error and success states
- Responsive layout

### ♿ Accesibilidad
- Full screen reader support
- Keyboard navigation
- Appropriate labels and descriptions
- Accessible error states

## Advanced Examples

### With React Hook Form

```tsx
import { useForm } from 'react-hook-form'
import { PhoneInput } from "@/components/ui/phone-input"

function FormWithValidation() {
  const { register, handleSubmit, watch, setValue } = useForm()
  const [isPhoneValid, setIsPhoneValid] = useState(true)

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone</FormLabel>
            <FormControl>
              <PhoneInput
                value={field.value}
                onChange={field.onChange}
                onValidation={setIsPhoneValid}
                className={!isPhoneValid ? "border-red-500" : ""}
              />
            </FormControl>
            {!isPhoneValid && (
              <FormMessage>Invalid phone number</FormMessage>
            )}
          </FormItem>
        )}
      />
    </form>
  )
}
```

### With a custom error state

```tsx
function PhoneWithCustomError() {
  const [phone, setPhone] = useState('')
  const [isValid, setIsValid] = useState(true)
  const [touched, setTouched] = useState(false)

  const showError = touched && phone && !isValid

  return (
    <div className="space-y-2">
      <Label htmlFor="phone">Phone *</Label>
      <PhoneInput
        id="phone"
        value={phone}
        onChange={(value) => {
          setPhone(value)
          setTouched(true)
        }}
        onValidation={setIsValid}
        onBlur={() => setTouched(true)}
        className={showError ? "border-red-500" : ""}
      />
      {showError && (
        <div className="flex items-center space-x-1 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">
            Please enter a valid phone number
          </span>
        </div>
      )}
    </div>
  )
}
```

## Project Integration

The component has already been integrated into:

### ✅ Registration form (`/auth/register`)
- Optional phone field
- Real-time validation
- Integrated with the form state

### ✅ Call simulation (`/assessment/call-simulation`)
- Caller phone number field
- Required validation
- Integrated with simulation data

## Customization

### CSS styles
You can customize the styles by editing:
```
src/styles/intl-tel-input-custom.css
```

### Default country
To change the default country, update the configuration in:
```tsx
// In src/components/ui/phone-input.tsx
initialCountry: "us" // Replace with the desired country code
```

### Preferred countries
To add preferred countries in the dropdown, update:
```tsx
// In the PhoneInput component
preferredCountries: ["us", "ca", "mx", "es"] // List of country codes
```

## Troubleshooting

### The component does not appear
- Verify that intl-tel-input is installed: `npm list intl-tel-input`
- Make sure the CSS styles are imported correctly

### TypeScript errors
- The component uses `as any` to avoid type conflicts with intl-tel-input
- This is normal and expected for this integration

### The country is not detected automatically
- Automatic country detection is disabled by default
- To enable it, add an IP geolocation service

## License

This component integrates intl-tel-input, which is licensed under MIT. See: https://github.com/jackocnr/intl-tel-input
