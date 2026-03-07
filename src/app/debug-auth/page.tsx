'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthAPI } from '@/services/auth-api';

export default function AuthDebugPage() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testDirectLogin = async () => {
    if (!credentials.email || !credentials.password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const authResponse = await AuthAPI.login({
        identifier: credentials.email,
        password: credentials.password,
      });

      setResponse(authResponse);
      console.log('Direct API Response:', authResponse);
    } catch (err: any) {
      setError(err.message);
      console.error('Direct API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Strapi Authentication Debug</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                placeholder="Enter your email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                placeholder="Enter your password"
              />
            </div>

            <Button 
              onClick={testDirectLogin} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Testing...' : 'Test Direct Strapi Login'}
            </Button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 font-medium">Error:</p>
                <p className="text-red-600">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {response && (
          <Card>
            <CardHeader>
              <CardTitle>Strapi Response Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">User Info:</h3>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p><strong>ID:</strong> {response.user?.id}</p>
                    <p><strong>Email:</strong> {response.user?.email}</p>
                    <p><strong>Username:</strong> {response.user?.username}</p>
                    <p><strong>First Name:</strong> {response.user?.firstName}</p>
                    <p><strong>Last Name:</strong> {response.user?.lastName}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Role Analysis:</h3>
                  <div className="bg-blue-50 p-3 rounded text-sm space-y-1">
                    <p><strong>Role Object:</strong></p>
                    <pre className="bg-white p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(response.user?.role, null, 2)}
                    </pre>
                    <p><strong>Role Type:</strong> {typeof response.user?.role}</p>
                    <p><strong>Role Name:</strong> {response.user?.role?.name || 'N/A'}</p>
                    <p><strong>Role ID:</strong> {response.user?.role?.id || 'N/A'}</p>
                    <p><strong>Role Description:</strong> {response.user?.role?.description || 'N/A'}</p>
                    <p><strong>Role Type (from object):</strong> {response.user?.role?.type || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Full Response:</h3>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="font-medium mb-2">NextAuth Role Extraction:</h3>
                  <div className="bg-green-50 p-3 rounded text-sm">
                    <p><strong>What NextAuth would extract:</strong></p>
                    <p>• Using role?.name: <code>{response.user?.role?.name || 'undefined'}</code></p>
                    <p>• Using role directly: <code>{typeof response.user?.role === 'string' ? response.user.role : 'not a string'}</code></p>
                    <p>• Final value: <code>{
                      response.user?.role?.name || 
                      (typeof response.user?.role === 'string' ? response.user.role : 'authenticated')
                    }</code></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <p>1. Enter credentials for a user you know exists in Strapi</p>
              <p>2. Click "Test Direct Strapi Login" to see the raw response</p>
              <p>3. Check the "Role Analysis" section to understand the role structure</p>
              <p>4. Use this information to configure your Strapi roles properly</p>
              <p className="font-medium text-blue-600">
                Expected: role.name should be "Admin" or "Candidate", not "Authenticated"
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}