"use client";

import { useState } from "react";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle } from "lucide-react";

export default function PhoneInputTestPage() {
  const [phone1, setPhone1] = useState("");
  const [isPhone1Valid, setIsPhone1Valid] = useState(true);

  const [phone2, setPhone2] = useState("+1 555-123-4567");
  const [isPhone2Valid, setIsPhone2Valid] = useState(true);

  const [phone3, setPhone3] = useState("");
  const [isPhone3Valid, setIsPhone3Valid] = useState(true);
  const [phone3Disabled, setPhone3Disabled] = useState(false);

  const handleSubmit = () => {
    console.log("Form data:", {
      phone1,
      isPhone1Valid,
      phone2,
      isPhone2Valid,
      phone3,
      isPhone3Valid,
    });
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">PhoneInput Component Test</h1>

      <div className="grid gap-6">
        {/* Test 1: Basic Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Test 1: Básico (Vacío)</CardTitle>
            <CardDescription>
              Campo de teléfono básico sin valor inicial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone1">Teléfono</Label>
              <PhoneInput
                id="phone1"
                value={phone1}
                onChange={setPhone1}
                onValidation={setIsPhone1Valid}
                placeholder="Ingresa tu número de teléfono"
              />
              <div className="flex items-center space-x-2 text-sm">
                {isPhone1Valid ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">Válido</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-600">Inválido</span>
                  </>
                )}
                <span className="text-muted-foreground">
                  | Valor: {phone1 || "(vacío)"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test 2: With Initial Value */}
        <Card>
          <CardHeader>
            <CardTitle>Test 2: Con valor inicial</CardTitle>
            <CardDescription>
              Campo con número estadounidense pre-cargado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone2">Teléfono (EE.UU.)</Label>
              <PhoneInput
                id="phone2"
                value={phone2}
                onChange={setPhone2}
                onValidation={setIsPhone2Valid}
                className={!isPhone2Valid ? "border-red-500" : ""}
              />
              <div className="flex items-center space-x-2 text-sm">
                {isPhone2Valid ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">Válido</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-600">Inválido</span>
                  </>
                )}
                <span className="text-muted-foreground">| Valor: {phone2}</span>
              </div>
              {!isPhone2Valid && (
                <p className="text-sm text-red-500">
                  Por favor ingresa un número válido
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test 3: Disabled State */}
        <Card>
          <CardHeader>
            <CardTitle>Test 3: Estado deshabilitado</CardTitle>
            <CardDescription>
              Probar el campo deshabilitado/habilitado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-4">
                <Label htmlFor="phone3">Teléfono</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPhone3Disabled(!phone3Disabled)}
                >
                  {phone3Disabled ? "Habilitar" : "Deshabilitar"}
                </Button>
              </div>
              <PhoneInput
                id="phone3"
                value={phone3}
                onChange={setPhone3}
                onValidation={setIsPhone3Valid}
                disabled={phone3Disabled}
                className={!isPhone3Valid && phone3 ? "border-red-500" : ""}
              />
              <div className="flex items-center space-x-2 text-sm">
                {isPhone3Valid ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">Válido</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-600">Inválido</span>
                  </>
                )}
                <span className="text-muted-foreground">
                  | Estado: {phone3Disabled ? "Deshabilitado" : "Habilitado"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instrucciones de prueba</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                <strong>Cómo probar:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    🌍 <strong>Bandera:</strong> Haz clic en la bandera para
                    cambiar el país
                  </li>
                  <li>
                    📱 <strong>Validación:</strong> Solo se permiten números y
                    el símbolo + al inicio
                  </li>
                  <li>
                    ✅ <strong>Formato:</strong> El número se formatea
                    automáticamente
                  </li>
                  <li>
                    🔢 <strong>Solo números:</strong> Las letras y símbolos
                    especiales se bloquean
                  </li>
                  <li>
                    🎯 <strong>Validación por país:</strong> Valida según el
                    código de país seleccionado
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Submit Test */}
        <Card>
          <CardContent className="pt-6">
            <Button onClick={handleSubmit} className="w-full">
              Probar datos en consola
            </Button>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Revisa la consola del navegador (F12) para ver los datos
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
