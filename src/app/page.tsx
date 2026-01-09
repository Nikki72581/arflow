'use client';
//test comment
import { CheckCircle, Zap, Shield, TrendingUp, Users, DollarSign, ArrowRight, Sparkles, BarChart3, Lock, Menu, X } from 'lucide-react';
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
            <div className="h-8 w-8 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">CommissionFlow</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-sm hover:text-blue-600 transition-colors">Features</a>
            <a href="#pricing" className="text-sm hover:text-blue-600 transition-colors">Pricing</a>
            <Link href="/sign-in" className="text-sm hover:text-blue-600 transition-colors">Sign In</Link>
            <Link href="/sign-in">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90">
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
            <a href="#features" className="block text-sm hover:text-blue-600">Features</a>
            <a href="#pricing" className="block text-sm hover:text-blue-600">Pricing</a>
            <Link href="/sign-in" className="block text-sm hover:text-blue-600">Sign In</Link>
            <Link href="/sign-in" className="block w-full">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600">Get Started</Button>
            </Link>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm">AI-Powered Commission Intelligence</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Sales Commission
            <br />
            Management,{' '}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Reimagined
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Ditch the spreadsheets. Harness AI to design, calculate, and manage sales commissions with complete confidence and transparency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/sign-in">
              <Button size="lg" className="px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90">
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
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">99.9%</div>
              <div className="text-sm text-muted-foreground mt-1">Accuracy Rate</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">10hrs</div>
              <div className="text-sm text-muted-foreground mt-1">Saved Per Month</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">5min</div>
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
              <h2 className="text-3xl md:text-5xl font-bold mb-4">The Commission Nightmare</h2>
              <p className="text-xl text-muted-foreground">Sound familiar? You're not alone.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-2 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/10 bg-gradient-to-br from-card to-muted/20 group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Spreadsheet Hell</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Manually tracking sales and calculating commissions in Excel is error-prone, time-consuming, and completely unsustainable as you scale.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-2 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/10 bg-gradient-to-br from-card to-muted/20 group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Zero Transparency</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Salespeople can't see their earnings in real-time, leading to constant questions, frustration, disputes, and missed motivation.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-2 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/10 bg-gradient-to-br from-card to-muted/20 group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Complex Plans</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Designing fair commission structures that motivate your team without breaking your budget is incredibly difficult and risky.
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
          <div className="absolute top-1/2 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
              <span className="text-sm font-semibold text-blue-600">POWERFUL FEATURES</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Everything You Need,<br />Nothing You Don't</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built for modern sales teams who demand accuracy, transparency, and speed
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            <FeatureCard
              icon={<Zap className="h-7 w-7" />}
              title="AI-Powered Plan Builder"
              description="Let AI help you design optimal commission structures or analyze existing plans for potential issues and hidden costs."
              gradient="from-blue-600 to-purple-600"
            />
            <FeatureCard
              icon={<TrendingUp className="h-7 w-7" />}
              title="Automated Calculations"
              description="Import sales data from any source and let CommissionFlow automatically calculate commissions based on your custom rules."
              gradient="from-blue-600 to-purple-600"
            />
            <FeatureCard
              icon={<Users className="h-7 w-7" />}
              title="Salesperson Portal"
              description="Give your team real-time visibility into their earnings with beautiful dashboards, detailed breakdowns, and progress tracking."
              gradient="from-blue-600 to-purple-600"
            />
            <FeatureCard
              icon={<Shield className="h-7 w-7" />}
              title="Secure & Compliant"
              description="Enterprise-grade security with role-based access control, data encryption, and complete audit trails for all transactions."
              gradient="from-blue-600 to-purple-600"
            />
            <FeatureCard
              icon={<Lock className="h-7 w-7" />}
              title="Seamless Integrations"
              description="Connect with your existing CRM, ERP, payment platforms, and HR systems for completely seamless data flow."
              gradient="from-blue-600 to-purple-600"
            />
            <FeatureCard
              icon={<DollarSign className="h-7 w-7" />}
              title="Payout Management"
              description="Track, approve, and process commission payouts all in one place with complete transparency and automated workflows."
              gradient="from-blue-600 to-purple-600"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gradient-to-b from-background via-muted/30 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
              <span className="text-sm font-semibold text-blue-600">PRICING</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">Choose the plan that fits your team. Scale as you grow.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            <PricingCard
              name="Starter"
              price="$29"
              description="Perfect for small teams"
              features={[
                'Up to 5 salespeople',
                'Basic commission plans',
                'CSV import/export',
                'Email support',
                'Mobile app access',
              ]}
            />
            <PricingCard
              name="Growth"
              price="$79"
              description="For growing businesses"
              features={[
                'Up to 20 salespeople',
                'AI plan assistant',
                'Advanced analytics',
                'Priority support',
                'API access',
                'Custom integrations',
              ]}
              highlighted
            />
            <PricingCard
              name="Professional"
              price="$149"
              description="For established teams"
              features={[
                'Up to 50 salespeople',
                'White-label options',
                'Custom workflows',
                'Dedicated support',
                'SSO/SAML',
                'Advanced security',
              ]}
            />
            <PricingCard
              name="Enterprise"
              price="Custom"
              description="For large organizations"
              features={[
                'Unlimited salespeople',
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
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 -z-10"></div>
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-6xl font-bold mb-6">
            Ready to Transform Your<br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Commission Process?
            </span>
          </h2>
          <p className="text-lg md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Join hundreds of forward-thinking companies that have eliminated commission headaches forever.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-in">
              <Button size="lg" className="px-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90">
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
              <div className="h-8 w-8 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">CommissionFlow</span>
            </div>
            <p className="text-sm text-muted-foreground">&copy; 2024 CommissionFlow. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Contact</a>
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
        ? 'border-2 border-blue-600 shadow-2xl shadow-blue-600/20 bg-gradient-to-br from-card to-blue-500/5' 
        : 'border-2 hover:border-blue-500/30 hover:shadow-xl'
    }`}>
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm rounded-full">
          Most Popular
        </div>
      )}
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="mt-6">
          <span className={`text-4xl font-bold ${highlighted ? 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent' : ''}`}>
            {price}
          </span>
          {price !== 'Custom' && <span className="text-muted-foreground">/mo</span>}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 mb-8">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${highlighted ? 'text-blue-600' : 'text-muted-foreground'}`} />
              <span className="text-sm leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>
        <Button className={`w-full ${highlighted ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90' : ''}`} variant={highlighted ? 'default' : 'outline'}>
          Get Started {highlighted && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardContent>
    </Card>
  );
}
