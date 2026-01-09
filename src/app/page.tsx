'use client';

import { CheckCircle, FileText, Shield, TrendingDown, Users, DollarSign, ArrowRight, Sparkles, BarChart3, Lock, Menu, X, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import Link from 'next/link';

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="w-full bg-amber-50 border-b border-amber-200">
        <div className="container mx-auto px-4 py-2 text-sm text-amber-900 flex items-center gap-2">
          <Shield className="h-4 w-4 text-amber-700" />
          <span>
            Early development preview. Free to try and open to the public, but use at your own risk. Pre-production updates may cause data loss.
          </span>
        </div>
      </div>
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-to-br from-teal-600 via-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">ARFlow</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-sm hover:text-teal-600 transition-colors">Features</a>
            <a href="#pricing" className="text-sm hover:text-teal-600 transition-colors">Pricing</a>
            <Link href="/sign-in" className="text-sm hover:text-teal-600 transition-colors">Sign In</Link>
            <Link href="/sign-in">
              <Button className="bg-gradient-to-r from-teal-600 to-blue-600 hover:opacity-90">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </nav>
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background p-4 space-y-4">
            <a href="#features" className="block text-sm hover:text-teal-600">Features</a>
            <a href="#pricing" className="block text-sm hover:text-teal-600">Pricing</a>
            <Link href="/sign-in" className="block text-sm hover:text-teal-600">Sign In</Link>
            <Link href="/sign-in" className="block w-full">
              <Button className="w-full bg-gradient-to-r from-teal-600 to-blue-600">Get Started</Button>
            </Link>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="container mx-auto px-4 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 mb-8">
            <Sparkles className="h-4 w-4 text-teal-600" />
            <span className="text-sm">Modern AR Management</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Give Your Customers
            <br />
            Clarity on{' '}
            <span className="bg-gradient-to-r from-teal-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Every Invoice
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            A secure, self-service B2B portal where your customers can view invoices, check balances, and manage their account—anytime, anywhere.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/sign-in">
              <Button size="lg" className="px-8 bg-gradient-to-r from-teal-600 to-blue-600 hover:opacity-90">
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#pricing">
              <Button variant="outline" size="lg" className="px-8 border-2">
                View Pricing
              </Button>
            </a>
          </div>
          <p className="text-sm text-muted-foreground">🎉 No credit card required • 14-day free trial • Setup in minutes</p>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div>
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">24/7</div>
              <div className="text-sm text-muted-foreground mt-1">Customer Access</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">50%</div>
              <div className="text-sm text-muted-foreground mt-1">Fewer AR Calls</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">5min</div>
              <div className="text-sm text-muted-foreground mt-1">Setup Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">The AR Communication Challenge</h2>
              <p className="text-xl text-muted-foreground">Your customers need answers. You need time.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-2 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/10 bg-gradient-to-br from-card to-muted/20 group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Email Overload</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Customers constantly emailing for invoice copies, balance inquiries, and payment status—eating up your AR team's time.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/10 bg-gradient-to-br from-card to-muted/20 group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>No Self-Service</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Without a customer portal, every simple inquiry requires manual intervention from your accounting team.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/10 bg-gradient-to-br from-card to-muted/20 group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <TrendingDown className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Payment Delays</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    When customers can't easily access their invoices and balances, payments slow down and DSO increases.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 mb-4">
              <span className="text-sm font-semibold text-teal-600">POWERFUL FEATURES</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Everything You Need,<br />Nothing You Don't</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built for B2B companies who want to empower their customers with transparency and self-service
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            <FeatureCard
              icon={<FileText className="h-7 w-7" />}
              title="Customer Invoice Portal"
              description="Customers log in to see all their invoices, payments, and current balance in real-time. No more emailing for copies."
              gradient="from-teal-600 to-blue-600"
            />
            <FeatureCard
              icon={<BarChart3 className="h-7 w-7" />}
              title="AR Aging & Analytics"
              description="View your complete AR aging summary, track overdue accounts, and monitor collection metrics in one dashboard."
              gradient="from-teal-600 to-blue-600"
            />
            <FeatureCard
              icon={<Users className="h-7 w-7" />}
              title="Customer Management"
              description="Manage your customer list, set credit limits, and invite customers to access their secure portal."
              gradient="from-teal-600 to-blue-600"
            />
            <FeatureCard
              icon={<Shield className="h-7 w-7" />}
              title="Secure & Compliant"
              description="Enterprise-grade security with role-based access control, data encryption, and complete audit trails."
              gradient="from-teal-600 to-blue-600"
            />
            <FeatureCard
              icon={<Lock className="h-7 w-7" />}
              title="ERP Integration"
              description="Connect with Acumatica and other ERP systems to automatically sync invoices and customer data."
              gradient="from-teal-600 to-blue-600"
            />
            <FeatureCard
              icon={<CreditCard className="h-7 w-7" />}
              title="Payment Tracking"
              description="Record payments and applications to invoices, keeping your AR records accurate and up-to-date."
              gradient="from-teal-600 to-blue-600"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gradient-to-b from-background via-muted/30 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 mb-4">
              <span className="text-sm font-semibold text-teal-600">PRICING</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">Choose the plan that fits your business. Scale as you grow.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            <PricingCard
              name="Starter"
              price="$49"
              description="Perfect for small businesses"
              features={[
                'Up to 10 customers',
                'Customer portal access',
                'Invoice management',
                'CSV import/export',
                'Email support',
              ]}
            />
            <PricingCard
              name="Growth"
              price="$99"
              description="For growing businesses"
              features={[
                'Up to 50 customers',
                'Payment tracking',
                'AR aging reports',
                'Priority support',
                'API access',
                'Basic integrations',
              ]}
              highlighted
            />
            <PricingCard
              name="Professional"
              price="$199"
              description="For established companies"
              features={[
                'Up to 150 customers',
                'Advanced reporting',
                'Custom workflows',
                'Dedicated support',
                'ERP integrations',
                'White-label options',
              ]}
            />
            <PricingCard
              name="Enterprise"
              price="Custom"
              description="For large organizations"
              features={[
                'Unlimited customers',
                'Custom everything',
                'SLA guarantees',
                'Account manager',
                'On-premise options',
                'Training & onboarding',
              ]}
            />
          </div>

          <p className="text-center text-muted-foreground mt-10">
            All plans include a 14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-blue-500/10 to-cyan-500/10 -z-10"></div>
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-6xl font-bold mb-6">
            Ready to Transform Your<br />
            <span className="bg-gradient-to-r from-teal-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              AR Experience?
            </span>
          </h2>
          <p className="text-lg md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Join forward-thinking companies that have given their customers clarity and saved countless AR team hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-in">
              <Button size="lg" className="px-10 bg-gradient-to-r from-teal-600 to-blue-600 hover:opacity-90">
                Start Your Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="px-10 border-2">
                View Demo Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-br from-teal-600 via-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">ARFlow</span>
            </div>
            <p className="text-sm text-muted-foreground">&copy; 2024 ARFlow. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-teal-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-teal-600 transition-colors">Terms</a>
              <a href="#" className="hover:text-teal-600 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  gradient
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 group bg-gradient-to-br from-card to-muted/20">
      <CardHeader>
        <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
          <div className="text-white">{icon}</div>
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

function PricingCard({
  name,
  price,
  description,
  features,
  highlighted = false
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <Card className={`relative transition-all hover:-translate-y-2 ${
      highlighted
        ? 'border-2 border-teal-600 shadow-2xl shadow-teal-600/20 bg-gradient-to-br from-card to-teal-500/5'
        : 'border-2 hover:border-teal-500/30 hover:shadow-xl'
    }`}>
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-teal-600 to-blue-600 text-white text-sm rounded-full">
          Most Popular
        </div>
      )}
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="mt-6">
          <span className={`text-4xl font-bold ${highlighted ? 'bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent' : ''}`}>
            {price}
          </span>
          {price !== 'Custom' && <span className="text-muted-foreground">/mo</span>}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 mb-8">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${highlighted ? 'text-teal-600' : 'text-muted-foreground'}`} />
              <span className="text-sm leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>
        <Button className={`w-full ${highlighted ? 'bg-gradient-to-r from-teal-600 to-blue-600 hover:opacity-90' : ''}`} variant={highlighted ? 'default' : 'outline'}>
          Get Started {highlighted && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardContent>
    </Card>
  );
}
