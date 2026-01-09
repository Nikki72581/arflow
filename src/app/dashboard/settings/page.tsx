'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { updateUserProfile, getUserProfile, updateNotificationPreferences, getOrganizationSettings, updateOrganizationSettings, updateThemePreference } from '@/app/actions/settings'
import { User, Bell, Shield, Loader2, ShoppingCart, MapPin, Award, ChevronRight, Settings, FolderKanban, Palette, Sun, Moon, Monitor } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useTheme } from '@/components/providers/theme-provider'
import Link from 'next/link'

interface UserProfile {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  createdAt: Date
  emailNotifications: boolean
  salesAlerts: boolean
  commissionAlerts: boolean
  weeklyReports: boolean
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
  const [salesAlerts, setSalesAlerts] = useState(true)
  const [commissionAlerts, setCommissionAlerts] = useState(true)
  const [weeklyReports, setWeeklyReports] = useState(false)

  // Organization settings
  const [requireProjects, setRequireProjects] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Load user profile
  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)
        const [profileResult, orgResult] = await Promise.all([
          getUserProfile(),
          getOrganizationSettings()
        ])

        if (profileResult.success && profileResult.data) {
          setProfile(profileResult.data)
          setFirstName(profileResult.data.firstName || '')
          setLastName(profileResult.data.lastName || '')
          setEmail(profileResult.data.email)
          setEmailNotifications(profileResult.data.emailNotifications)
          setSalesAlerts(profileResult.data.salesAlerts)
          setCommissionAlerts(profileResult.data.commissionAlerts)
          setWeeklyReports(profileResult.data.weeklyReports)
          setIsAdmin(profileResult.data.role === 'ADMIN')
        } else {
          setError(profileResult.error || 'Failed to load profile')
        }

        if (orgResult.success && orgResult.data) {
          setRequireProjects(orgResult.data.requireProjects)
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
        email: email || undefined,
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
        salesAlerts,
        commissionAlerts,
        weeklyReports,
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

  async function handleOrganizationSettingsUpdate(newRequireProjects: boolean) {
    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      const result = await updateOrganizationSettings({
        requireProjects: newRequireProjects,
      })

      if (result.success) {
        setRequireProjects(newRequireProjects)
        setSuccess('Organization settings updated successfully')
        router.refresh()
      } else {
        setError(result.error || 'Failed to update organization settings')
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
      const result = await updateThemePreference({ themePreference: newTheme })

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

      {/* Commission Setup Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Commission Setup</CardTitle>
          </div>
          <CardDescription>
            Configure product categories, territories, and customer tier definitions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Settings - Admin Only */}
          {isAdmin && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5 text-primary" />
                    <Label htmlFor="requireProjects" className="font-semibold">Require Projects for Sales</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    When enabled, all sales transactions must be associated with a project. When disabled, sales can be created without selecting a project.
                  </p>
                </div>
                <Switch
                  id="requireProjects"
                  checked={requireProjects}
                  onCheckedChange={handleOrganizationSettingsUpdate}
                  disabled={saving}
                />
              </div>
              <p className="text-xs text-muted-foreground px-1">
                This setting only affects new sales transactions. Existing sales will retain their project associations.
              </p>
            </div>
          )}

          <Separator className="bg-indigo-500/20" />

          <div className="grid gap-4 md:grid-cols-3">
            {/* Product Categories */}
            <Link href="/dashboard/settings/product-categories">
              <Card className="cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold">Product Categories</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Organize products into categories for targeted commission rules
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Territories */}
            <Link href="/dashboard/settings/territories">
              <Card className="cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold">Territories</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Define sales territories and assign clients for regional rules
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Customer Tiers */}
            <Link href="/dashboard/settings/customer-tiers">
              <Card className="cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-purple-600" />
                        <h3 className="font-semibold">Customer Tiers</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        View tier definitions: STANDARD, VIP, NEW, and ENTERPRISE
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-indigo-500/20" />

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
                  {profile?.role === 'ADMIN' ? 'Administrator' : 'Salesperson'}
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
            Customize how CommissionFlow looks on your device
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
              <Label htmlFor="salesAlerts">Sales Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when new sales are recorded
              </p>
            </div>
            <input
              type="checkbox"
              id="salesAlerts"
              checked={salesAlerts}
              onChange={(e) => setSalesAlerts(e.target.checked)}
              className="h-4 w-4 rounded border-input cursor-pointer"
            />
          </div>

          <Separator className="bg-indigo-500/20" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="commissionAlerts">Commission Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about commission calculations and payouts
              </p>
            </div>
            <input
              type="checkbox"
              id="commissionAlerts"
              checked={commissionAlerts}
              onChange={(e) => setCommissionAlerts(e.target.checked)}
              className="h-4 w-4 rounded border-input cursor-pointer"
            />
          </div>

          <Separator className="bg-indigo-500/20" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weeklyReports">Weekly Reports</Label>
              <p className="text-sm text-muted-foreground">
                Receive weekly performance summaries
              </p>
            </div>
            <input
              type="checkbox"
              id="weeklyReports"
              checked={weeklyReports}
              onChange={(e) => setWeeklyReports(e.target.checked)}
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
            <Label>Account Created</Label>
            <p className="text-sm text-muted-foreground">
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'N/A'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
