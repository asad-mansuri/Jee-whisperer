import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/AuthModal';
import { GraduationCap, Brain, Users, Trophy, ArrowRight, BookOpen, Zap } from 'lucide-react';
const Welcome = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const features = [{
    icon: Brain,
    title: 'AI-Powered Learning',
    description: 'Get personalized explanations and step-by-step solutions from our smart tutor.'
  }, {
    icon: BookOpen,
    title: 'Interactive Quizzes',
    description: 'Test your knowledge with engaging quizzes tailored to Class 10 Science.'
  }, {
    icon: Zap,
    title: 'Live Simulations',
    description: 'Explore physics and chemistry concepts through interactive PhET simulations.'
  }, {
    icon: Users,
    title: 'Study Together',
    description: 'Connect with classmates and learn together in our student community.'
  }];
  return <div className="min-h-screen bg-gradient-hero">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-primary p-2 rounded-xl shadow-soft">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Smart AI Tutor</h1>
            <p className="text-sm text-muted-foreground">Class 10 Science Made Easy</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setAuthModalOpen(true)} className="hover-lift">
            Sign In
          </Button>
          <Button onClick={() => setAuthModalOpen(true)} className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-soft hover-lift">
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className="mb-8">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Learn Class 10 Science
              <br />
              
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
              Master physics, chemistry, and biology with bite-sized lessons, interactive simulations, 
              and your personal AI tutor. Get ready for your board exams with confidence.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" onClick={() => setAuthModalOpen(true)} className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-soft text-lg px-8 py-6 hover-lift group">
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button variant="outline" size="lg" onClick={() => setAuthModalOpen(true)} className="text-lg px-8 py-6 hover-lift bg-background/50 backdrop-blur-sm">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Everything you need to excel
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From AI-powered tutoring to interactive simulations, we've got all the tools 
            to make learning science fun and effective.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => <div key={feature.title} className="bg-gradient-card p-6 rounded-xl shadow-card hover-lift animate-slide-up border border-border/50" style={{
          animationDelay: `${index * 0.1}s`
        }}>
              <div className="bg-gradient-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>)}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="bg-gradient-card rounded-2xl p-12 text-center shadow-card border border-border/50">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to transform your learning?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of students who are already acing their Class 10 Science exams with Smart AI Tutor.
          </p>
          <Button size="lg" onClick={() => setAuthModalOpen(true)} className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-soft text-lg px-8 py-6 hover-lift group">
            Start Learning Today
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background/50 backdrop-blur-sm py-8">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-gradient-primary p-2 rounded-lg">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Smart AI Tutor</span>
          </div>
          <p className="text-muted-foreground">
            Empowering Class 10 students to excel in Science • Made By CODE STORM for learning
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>;
};
export default Welcome;