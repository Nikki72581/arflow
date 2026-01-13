'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { updateUserProfile, getUserProfile, updateNotificationPreferences, updateThemePreference } from '@/app/actions/settings'
import { User, Bell, Shield, Loader2, ChevronRight, Settings, Palette, Sun, Moon, Monitor, Users, FileText, CreditCard, Wallet, Plug, Mail } from 'lucide-react'
import { useTheme } from '@/components/providers/theme-provider'
import Link from 'next/link'
import { EmailSettings } from '@/components/administration/email-settings'

interface UserProfile {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  emailNotifications: boolean
  invoiceAlerts: boolean
  paymentAlerts: boolean
  statementAlerts: boolean
  themePreference: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { theme, setTheme } = useTheme()

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [invoiceAlerts, setInvoiceAlerts] = useState(true)
  const [paymentAlerts, setPaymentAlerts] = useState(true)
  const [statementAlerts, setStatementAlerts] = useState(false)

  // Organization settings
  const [isAdmin, setIsAdmin] = useState(false)

  // Load user profile
  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)
        const profileResult = await getUserProfile()

        if (profileResult.success && profileResult.data) {
          setProfile(profileResult.data)
          setFirstName(profileResult.data.firstName || '')
          setLastName(profileResult.data.lastName || '')
          setEmail(profileResult.data.email)
          setEmailNotifications(profileResult.data.emailNotifications)
          setInvoiceAlerts(profileResult.data.invoiceAlerts)
          setPaymentAlerts(profileResult.data.paymentAlerts)
          setStatementAlerts(profileResult.data.statementAlerts)
          setIsAdmin(profileResult.data.role === 'ADMIN')
        } else {
          setError(profileResult.error || 'Failed to load profile')
        }
      } catch (err) {
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      const result = await updateUserProfile({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      })

      if (result.success) {
        setSuccess('Profile updated successfully')
        router.refresh()
      } else {
        setError(result.error || 'Failed to update profile')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  async function handlePreferencesUpdate() {
    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      const result = await updateNotificationPreferences({
        emailNotifications,
        invoiceAlerts,
        paymentAlerts,
        statementAlerts,
      })

      if (result.success) {
        setSuccess('Notification preferences updated successfully')
        router.refresh()
      } else {
        setError(result.error || 'Failed to update preferences')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }


  async function handleThemeChange(newTheme: 'light' | 'dark' | 'system') {
    setError(null)
    setSuccess(null)
    setTheme(newTheme)

    try {
      const result = await updateThemePreference(newTheme)

      if (result.success) {
        setSuccess('Theme preference updated successfully')
        // Clear success message after 2 seconds
        setTimeout(() => setSuccess(null), 2000)
      } else {
        setError(result.error || 'Failed to update theme preference')
        // Revert theme on error
        setTheme(profile?.themePreference as 'light' | 'dark' | 'system' || 'system')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      // Revert theme on error
      setTheme(profile?.themePreference as 'light' | 'dark' | 'system' || 'system')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <Separator className="bg-indigo-500/20" />

      {/* System Settings Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>System Settings</CardTitle>
          </div>
          <CardDescription>
            Configure system-wide settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Team Management */}
            {isAdmin && (
              <Link href="/dashboard/team">
                <Card className="cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold">Team</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Manage team members and their roles
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {/* Document Types */}
            {isAdmin && (
              <Link href="/dashboard/administration/document-types">
                <Card className="cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-green-600" />
                          <h3 className="font-semibold">Document Types</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Configure document types and display names
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {/* Payment Terms */}
            {isAdmin && (
              <Link href="/dashboard/administration/payment-terms">
                <Card className="cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-purple-600" />
                          <h3 className="font-semibold">Payment Terms</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Configure payment terms and due dates
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {/* Payment Providers */}
            {isAdmin && (
              <Link href="/dashboard/administration/payment-providers">
                <Card className="cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-5 w-5 text-orange-600" />
                          <h3 className="font-semibold">Payment Providers</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Configure payment provider integrations
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {/* Integrations */}
            {isAdmin && (
              <Link href="/dashboard/integrations">
                <Card className="cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Plug className="h-5 w-5 text-indigo-600" />
                          <h3 className="font-semibold">Integrations</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Manage accounting system integrations
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-indigo-500/20" />

      {/* Email Configuration (Admin Only) */}
      {isAdmin && <EmailSettings />}

      {isAdmin && <Separator className="bg-indigo-500/20" />}

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Profile Information</CardTitle>
          </div>
          <CardDescription>
            Update your personal information and email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@example.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                This is the email associated with your account
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Role</Label>
              <div className="flex items-center h-9 px-3 py-2 rounded-md border bg-muted/50">
                <span className="text-sm font-medium">
                  {profile?.role === 'ADMIN' ? 'Administrator' : 'Customer'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Contact your administrator to change your role
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Theme Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>
            Customize how ARFlow looks on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Theme Mode</Label>
            <div className="grid gap-3">
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  theme === 'light'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Sun className="h-5 w-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Light</div>
                  <div className="text-sm text-muted-foreground">
                    Use light theme
                  </div>
                </div>
                {theme === 'light' && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                  </div>
                )}
              </button>

              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  theme === 'dark'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Moon className="h-5 w-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Dark</div>
                  <div className="text-sm text-muted-foreground">
                    Use dark theme
                  </div>
                </div>
                {theme === 'dark' && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                  </div>
                )}
              </button>

              <button
                onClick={() => handleThemeChange('system')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  theme === 'system'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Monitor className="h-5 w-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">System</div>
                  <div className="text-sm text-muted-foreground">
                    Follow your system preferences
                  </div>
                </div>
                {theme === 'system' && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
          <CardDescription>
            Choose what notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emailNotifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <input
              type="checkbox"
              id="emailNotifications"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="h-4 w-4 rounded border-input cursor-pointer"
            />
          </div>

          <Separator className="bg-indigo-500/20" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="invoiceAlerts">Invoice Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when new invoices are created
              </p>
            </div>
            <input
              type="checkbox"
              id="invoiceAlerts"
              checked={invoiceAlerts}
              onChange={(e) => setInvoiceAlerts(e.target.checked)}
              className="h-4 w-4 rounded border-input cursor-pointer"
            />
          </div>

          <Separator className="bg-indigo-500/20" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="paymentAlerts">Payment Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about payment applications and updates
              </p>
            </div>
            <input
              type="checkbox"
              id="paymentAlerts"
              checked={paymentAlerts}
              onChange={(e) => setPaymentAlerts(e.target.checked)}
              className="h-4 w-4 rounded border-input cursor-pointer"
            />
          </div>

          <Separator className="bg-indigo-500/20" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="statementAlerts">Statement Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Receive monthly account statements
              </p>
            </div>
            <input
              type="checkbox"
              id="statementAlerts"
              checked={statementAlerts}
              onChange={(e) => setStatementAlerts(e.target.checked)}
              className="h-4 w-4 rounded border-input cursor-pointer"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              onClick={handlePreferencesUpdate}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Preferences'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security & Privacy */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Security & Privacy</CardTitle>
          </div>
          <CardDescription>
            Manage your account security and privacy settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Password</Label>
            <p className="text-sm text-muted-foreground">
              Password management is handled through your authentication provider
            </p>
            <Button variant="outline" size="sm">
              Change Password
            </Button>
          </div>

          <Separator className="bg-indigo-500/20" />

          <div className="space-y-2">
            <Label>Two-Factor Authentication</Label>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account
            </p>
            <Button variant="outline" size="sm">
              Enable 2FA
            </Button>
          </div>

          <Separator className="bg-indigo-500/20" />

          <div className="space-y-2">
            <Label>Role</Label>
            <p className="text-sm text-muted-foreground">
              {profile?.role === 'ADMIN' ? 'Administrator' : 'Customer'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
