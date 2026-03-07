# PhoneInput Component Documentation

## Descripción

El componente `PhoneInput` es un campo de entrada de teléfono que integra la librería [intl-tel-input](https://github.com/jackocnr/intl-tel-input) en el sistema de diseño de tu aplicación React/Next.js. Proporciona:

- ✅ Validación automática de números de teléfono internacionales
- 🌍 Selector de país con banderas
- 🎨 Integración completa con el sistema de diseño de shadcn/ui
- 🔧 Formateo automático de números
- ♿ Accesibilidad completa
- 🌓 Soporte para modo oscuro

## Instalación

El componente ya está instalado con las dependencias necesarias:

```bash
npm install intl-tel-input
```

## Uso Básico

```tsx
import { PhoneInput } from "@/components/ui/phone-input"

function MyForm() {
  const [phone, setPhone] = useState('')
  const [isValid, setIsValid] = useState(true)

  return (
    <div className="space-y-2">
      <Label htmlFor="phone">Teléfono</Label>
      <PhoneInput
        id="phone"
        value={phone}
        onChange={setPhone}
        onValidation={setIsValid}
      />
      {!isValid && phone && (
        <p className="text-sm text-red-500">
          Por favor ingresa un número válido
        </p>
      )}
    </div>
  )
}
```

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `value` | `string` | `""` | Valor actual del teléfono |
| `onChange` | `(value: string) => void` | - | Callback cuando cambia el valor |
| `onValidation` | `(isValid: boolean) => void` | - | Callback para el estado de validación |
| `className` | `string` | - | Clases CSS adicionales |
| `disabled` | `boolean` | `false` | Si el campo está deshabilitado |
| ...props | `InputHTMLAttributes` | - | Otras props de input HTML |

## Características

### 🌍 Detección automática de país
El componente inicia con el código de país "US" por defecto, pero los usuarios pueden seleccionar cualquier país del mundo.

### 📱 Validación en tiempo real
La validación se ejecuta automáticamente cuando el usuario escribe o cambia el país seleccionado.

### 🎨 Estilos personalizados
Se incluye un archivo CSS personalizado que integra perfectamente intl-tel-input con el sistema de diseño:
- Variables CSS personalizadas para colores
- Soporte para modo oscuro
- Estados de error y éxito
- Diseño responsive

### ♿ Accesibilidad
- Soporte completo para lectores de pantalla
- Navegación por teclado
- Labels y descripciones apropiadas
- Estados de error accesibles

## Ejemplos Avanzados

### Con React Hook Form

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
            <FormLabel>Teléfono</FormLabel>
            <FormControl>
              <PhoneInput
                value={field.value}
                onChange={field.onChange}
                onValidation={setIsPhoneValid}
                className={!isPhoneValid ? "border-red-500" : ""}
              />
            </FormControl>
            {!isPhoneValid && (
              <FormMessage>Número de teléfono inválido</FormMessage>
            )}
          </FormItem>
        )}
      />
    </form>
  )
}
```

### Con estado de error personalizado

```tsx
function PhoneWithCustomError() {
  const [phone, setPhone] = useState('')
  const [isValid, setIsValid] = useState(true)
  const [touched, setTouched] = useState(false)

  const showError = touched && phone && !isValid

  return (
    <div className="space-y-2">
      <Label htmlFor="phone">Teléfono *</Label>
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
            Por favor ingresa un número de teléfono válido
          </span>
        </div>
      )}
    </div>
  )
}
```

## Integración en el proyecto

El componente se ha integrado automáticamente en:

### ✅ Formulario de registro (`/auth/register`)
- Campo opcional de teléfono
- Validación en tiempo real
- Integración con el estado del formulario

### ✅ Simulación de llamadas (`/assessment/call-simulation`)
- Campo para número del caller
- Validación requerida
- Integración con datos de simulación

## Personalización

### Estilos CSS
Los estilos se pueden personalizar editando:
```
src/styles/intl-tel-input-custom.css
```

### País inicial
Para cambiar el país inicial, modifica la configuración en:
```tsx
// En src/components/ui/phone-input.tsx
initialCountry: "us" // Cambia por el código de país deseado
```

### Países preferidos
Para agregar países preferidos en el dropdown, modifica:
```tsx
// En el componente PhoneInput
preferredCountries: ["us", "ca", "mx", "es"] // Lista de códigos de país
```

## Troubleshooting

### El componente no se muestra
- Verifica que intl-tel-input esté instalado: `npm list intl-tel-input`
- Asegúrate de que los estilos CSS se importen correctamente

### Errores de TypeScript
- El componente usa `as any` para evitar conflictos de tipos con intl-tel-input
- Esto es normal y esperado para esta integración

### El país no se detecta automáticamente
- La detección de país automática está deshabilitada por defecto
- Para habilitarla, agrega un servicio de geolocalización IP

## Licencia

Este componente integra intl-tel-input que tiene licencia MIT. Ver: https://github.com/jackocnr/intl-tel-input