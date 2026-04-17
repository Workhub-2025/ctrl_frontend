"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Siren,
  Shield,
  Award,
  Clock,
  Phone,
  Mail,
  MapPin,
  Star,
  Sun,
  Moon,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { useEffect, useState } from "react";

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Emergency Call Handler",
    company: "Metro Control Room",
    content:
      "CTRL helped me demonstrate my readiness for this critical role. The assessments are fair, realistic, and exactly what control rooms need.",
    rating: 5,
  },
  {
    name: "Miguel Rodriguez",
    role: "Control Room Supervisor",
    company: "City Emergency Services",
    content:
      "Finally, an assessment tool that measures what really matters. CTRL helps us identify candidates who can handle the pressure and serve the public.",
    rating: 5,
  },
  {
    name: "Jennifer Chen",
    role: "Training Coordinator",
    company: "Regional Control Centre",
    content:
      "The evidence-based approach gives us confidence in our hiring decisions. Candidates appreciate the transparency and fairness of the process.",
    rating: 5,
  },
];

const features = [
  {
    icon: Shield,
    title: "Built using 30+ years of insights",
    description:
      "CTRL isn't theory — it's built from first-hand experience inside police control rooms. It reflects the realities of emergency control room operations: multitasking, quick thinking, emotional control and calm communication under pressure. That authenticity means assessments are relevant, realistic, and respected by operational teams.",
  },
  {
    icon: Award,
    title: "Precision Selection for Critical Roles",
    description:
      "Hiring the wrong person for an emergency control room role has high risks — operational, financial and emotional. CTRL helps organisations identify candidates who have the skills and behavioural traits to succeed. This means better hires, improved operational outcomes and lower attrition.",
  },
  {
    icon: Clock,
    title: "Evidence-Based, Fair, and Transparent",
    description:
      "CTRL combines behavioural science, human factors, and data-driven testing. Every assessment is objective, standardised, and defensible, ensuring fairness across all candidates. The platform provides organisations with clear, data-backed reports to support high quality, confident and transparent recruitment decisions.",
  },
  {
    icon: Star,
    title: "Designed for Candidate Confidence",
    description:
      "Our user-friendly interface has been designed to be calming and professional, allowing candidates to focus on the task — not the technology. Practice modules and clear instructions reduce anxiety and give every applicant a fair chance to show their potential.",
  },
  {
    icon: Siren,
    title: "Operational Efficiency and Cost Savings",
    description:
      "CTRL streamlines the assessment centre process: automated scoring, digital reporting, and scalable sessions. It saves staff time, reduces the costs and helps organisations make better decisions faster.",
  },
  {
    icon: Phone,
    title: "Flexible and Scalable",
    description:
      "Catered to all emergency control room, CTRL adapts to each service's environment. It can grow from call handler recruitment to dispatcher and supervisory roles, supporting the full control room talent pipeline.",
  },
  {
    icon: CheckCircle,
    title: "A Trusted Standard for Public Service Recruitment",
    description:
      "CTRL aims to become the national benchmark for assessing emergency control room candidates — built with integrity, designed for fairness, and driven by real operational insight.",
  },
];

export default function Home() {
  const { theme, toggle } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Slides del carrusel con diferentes fondos y contenido
  const slides = [
    {
      id: 1,
      title: "Hiring the right call handlers",
      subtitle: "starts with the right intelligence",
      description:
        "CTRL empowers emergency services to recruit with confidence through evidence-based, candidate-friendly assessments.",
      background: "from-blue-600 via-purple-600 to-blue-800",
      image:
        "https://images.pexels.com/photos/263356/pexels-photo-263356.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
    },
    {
      id: 2,
      title: "Professional Emergency Training",
      subtitle: "Real scenarios for real results",
      description:
        "Advanced simulation training for medical personnel and emergency responders with realistic scenarios.",
      background: "from-emerald-600 via-teal-600 to-cyan-800",
      image:
        "https://images.pexels.com/photos/668298/pexels-photo-668298.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
    },
    {
      id: 3,
      title: "Security Team Simulations",
      subtitle: "Enhanced preparedness protocols",
      description:
        "Comprehensive security training programs designed for emergency response teams and safety protocols.",
      background: "from-orange-600 via-red-600 to-pink-800",
      image:
        "https://images.pexels.com/photos/266403/pexels-photo-266403.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
    },
    {
      id: 4,
      title: "Comprehensive Emergency Preparation",
      subtitle: "Complete training solutions",
      description:
        "Integrated emergency preparedness training that covers all aspects of crisis management and response.",
      background: "from-violet-600 via-indigo-600 to-blue-800",
      image:
        "https://images.pexels.com/photos/47863/firefighter-extinguish-fire-extinction-47863.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop",
    },
  ];

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 7000);

    return () => clearInterval(timer);
  }, [slides.length]);

  // Handle header scroll effect and mobile menu
  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.getElementById("hero-carousel");
      if (heroSection) {
        const heroHeight = heroSection.offsetHeight;
        const scrollY = window.scrollY;
        const isScrolledPast = scrollY > heroHeight - 100;
        setIsScrolled(isScrolledPast);
      }
      // Close mobile menu when scrolling
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    // Initial check
    handleScroll();

    // Add scroll listener with throttling
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Modern Navigation with Theme Toggle */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? "header-scrolled" : "header-transparent"
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center relative">
              <div className="w-15 h-15 flex items-center justify-center">
                <img
                  src="./icon1.png"
                  alt="CTRL"
                  className="h-15 w-15 logo-adaptive cursor-pointer transition-transform hover:scale-105 logo-adaptive-filter"
                />
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <Link href="#features" className="header-link font-medium">
                Features
              </Link>
              <Link href="#testimonials" className="header-link font-medium">
                Testimonials
              </Link>
              <Link href="#contact" className="header-link font-medium">
                Contact
              </Link>
              <Separator
                orientation="vertical"
                className={`h-6 ${isScrolled ? "" : "bg-white/30"}`}
              />
              <Link href="/auth/login" className="header-link font-medium">
                Sign In
              </Link>
              <Button
                asChild
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Link href="/auth/register">Sign Up</Link>
              </Button>

              {/* Theme Toggle Button */}
              <button
                onClick={toggle}
                className={`p-2 rounded-full backdrop-blur-sm border transition-all duration-200 hover:scale-110 theme-toggle ${
                  theme === "dark" ? "dark" : ""
                } ${
                  isScrolled
                    ? "bg-background/80 border-border hover:bg-background"
                    : "bg-white/20 border-white/30 hover:bg-white/30 text-white"
                }`}
                aria-label="Toggle theme"
              >
                <Sun className="h-4 w-4 sun-icon" />
                <Moon className="h-4 w-4 moon-icon" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg backdrop-blur-sm border transition-all duration-200 hover:scale-110 ${
                isScrolled
                  ? "bg-background/80 border-border hover:bg-background text-foreground"
                  : "bg-white/20 border-white/30 hover:bg-white/30 text-white"
              }`}
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              <div className="relative w-5 h-5">
                <span
                  className={`absolute block w-5 h-0.5 bg-current transform transition-all duration-300 ${
                    isMobileMenuOpen
                      ? "rotate-45 translate-y-2"
                      : "translate-y-1"
                  }`}
                />
                <span
                  className={`absolute block w-5 h-0.5 bg-current transform transition-all duration-300 translate-y-2 ${
                    isMobileMenuOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute block w-5 h-0.5 bg-current transform transition-all duration-300 ${
                    isMobileMenuOpen
                      ? "-rotate-45 translate-y-2"
                      : "translate-y-3"
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <div
          className={`md:hidden absolute top-full left-0 right-0 backdrop-blur-md border-t transition-all duration-300 overflow-hidden ${
            isScrolled
              ? "bg-background/95 border-border"
              : "bg-black/20 border-white/30"
          } ${
            isMobileMenuOpen
              ? "max-h-96 opacity-100 visible"
              : "max-h-0 opacity-0 invisible"
          }`}
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col space-y-4">
              {/* Navigation Links */}
              <Link
                href="#features"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block py-3 px-4 rounded-lg font-medium transition-colors ${
                  isScrolled
                    ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                    : "text-white hover:bg-white/10"
                }`}
              >
                Features
              </Link>
              <Link
                href="#testimonials"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block py-3 px-4 rounded-lg font-medium transition-colors ${
                  isScrolled
                    ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                    : "text-white hover:bg-white/10"
                }`}
              >
                Testimonials
              </Link>
              <Link
                href="#contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block py-3 px-4 rounded-lg font-medium transition-colors ${
                  isScrolled
                    ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                    : "text-white hover:bg-white/10"
                }`}
              >
                Contact
              </Link>

              {/* Separator */}
              <div
                className={`h-px ${isScrolled ? "bg-border" : "bg-white/30"}`}
              />

              {/* Auth Links */}
              <Link
                href="/auth/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block py-3 px-4 rounded-lg font-medium transition-colors ${
                  isScrolled
                    ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                    : "text-white hover:bg-white/10"
                }`}
              >
                Sign In
              </Link>

              <div className="flex items-center space-x-3 px-4">
                <Button
                  asChild
                  size="sm"
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Link href="/auth/register">Sign Up</Link>
                </Button>

                {/* Theme Toggle in Mobile Menu */}
                <button
                  onClick={() => {
                    toggle();
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-2 rounded-lg backdrop-blur-sm border transition-all duration-200 theme-toggle ${
                    theme === "dark" ? "dark" : ""
                  } ${
                    isScrolled
                      ? "bg-background/80 border-border hover:bg-background"
                      : "bg-white/20 border-white/30 hover:bg-white/30 text-white"
                  }`}
                  aria-label="Toggle themºe"
                >
                  <Sun className="h-4 w-4 sun-icon" />
                  <Moon className="h-4 w-4 moon-icon" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Modern Hero Carousel Section */}
      <section
        id="hero-carousel"
        className="relative h-screen flex items-center justify-center overflow-hidden pt-16"
      >
        {/* Carousel Container */}
        <div className="absolute inset-0 z-0">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`carousel-slide ${
                index === currentSlide ? "active" : ""
              } bg-gradient-to-br ${slide.background}`}
              style={{
                backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url('${slide.image}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundBlendMode: "overlay",
              }}
            >
              <div className="absolute inset-0 bg-black/20"></div>
            </div>
          ))}
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full opacity-20 blur-xl"></div>
        <div className="absolute bottom-20 left-10 w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full opacity-20 blur-xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-transparent rounded-full blur-3xl"></div>

        {/* Dynamic Hero Content */}
        <div className="relative z-10 text-center text-white px-4 max-w-5xl mx-auto">
          <Badge
            variant="secondary"
            className="inline-flex flex-col items-center justify-center space-y-1 text-center mb-6 bg-background/20 backdrop-blur-sm text-white border-white/20 hover:bg-accent/30 hover:text-accent-foreground transition-all duration-200 animate-fade-in px-3 py-2"
          >
            <div>CTRL (Control Room Talent, Recruitment & Logic)</div>
            <div>
              Hiring the right people starts with the right intelligence
            </div>
          </Badge>

          <h1 className="text-responsive-7xl font-bold mb-8 leading-tight transition-all duration-700 ease-in-out text-white">
            {slides[currentSlide].title}
            <br />
            <span className="bg-gradient-to-r from-blue-200 via-white to-blue-200 bg-clip-text text-transparent">
              {slides[currentSlide].subtitle}
            </span>
          </h1>

          <p className="text-responsive-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed transition-all duration-700 ease-in-out">
            {slides[currentSlide].description}
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
            <Button
              asChild
              size="lg"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-lg font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-background text-foreground hover:bg-accent hover:text-accent-foreground px-8 py-4 z-20 relative"
            >
              <Link href="/demo">Begin Assessment</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-lg font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-background text-foreground hover:bg-accent hover:text-accent-foreground px-8 py-4 z-20 relative"
              asChild
            >
              <Link href="#contact">Request Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Modern Features Section */}
      <section
        id="features"
        className="py-24 px-4 bg-gradient-to-br from-background via-muted/30 to-background relative overflow-hidden"
      >
        {/* Background Decorations */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-48 h-48 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-full blur-2xl"></div>
        </div>

        <div className="container mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-responsive-5xl font-bold mb-6 title-adaptive">
              Why emergency control rooms choose CTRL
            </h2>
            <p className="text-adaptive-secondary text-responsive-xl max-w-3xl mx-auto leading-relaxed">
              Emergency control rooms choose CTRL because it combines lived
              experience, behavioural insight and technology to find capable,
              resilient and motivated communicators for vital interactions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="text-center group card-adaptive-blur hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10"
              >
                <CardHeader className="pb-4">
                  <div
                    className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl 
                    ${
                      index === 0
                        ? "bg-gradient-to-br from-blue-500 to-blue-600"
                        : ""
                    }
                    ${
                      index === 1
                        ? "bg-gradient-to-br from-green-500 to-green-600"
                        : ""
                    }
                    ${
                      index === 2
                        ? "bg-gradient-to-br from-purple-500 to-purple-600"
                        : ""
                    }
                    ${
                      index === 3
                        ? "bg-gradient-to-br from-yellow-500 to-orange-500"
                        : ""
                    }
                    ${
                      index === 4
                        ? "bg-gradient-to-br from-red-500 to-pink-500"
                        : ""
                    }
                    ${
                      index === 5
                        ? "bg-gradient-to-br from-indigo-500 to-blue-500"
                        : ""
                    }
                    ${
                      index === 6
                        ? "bg-gradient-to-br from-teal-500 to-cyan-500"
                        : ""
                    }
                    text-white group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                  >
                    <feature.icon className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-responsive-xl font-bold text-adaptive-primary group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-adaptive-secondary leading-relaxed text-responsive-base">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Modern Testimonials Section */}
      <section
        id="testimonials"
        className="py-24 px-4 relative overflow-hidden"
      >
        {/* Background with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900"></div>

        <div className="container mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-responsive-5xl font-bold mb-6 title-adaptive">
              Trusted by Control Room Professionals
            </h2>
            <p className="text-adaptive-secondary text-responsive-xl max-w-2xl mx-auto leading-relaxed">
              The recruitment partner of choice for selecting capable, resilient
              and motivated communicators who strive under pressure.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card
                key={testimonial.name}
                className="group card-adaptive-blur hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl"
              >
                <CardHeader className="text-center pb-4">
                  {/* Profile Image Placeholder */}
                  <div className="w-16 h-16 mx-auto mb-4 avatar-adaptive rounded-full flex items-center justify-center text-responsive-xl font-bold shadow-lg">
                    {testimonial.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>

                  <div className="flex items-center justify-center space-x-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={`${testimonial.name}-star-${i}`}
                        className="h-5 w-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>

                  <CardTitle className="text-responsive-xl font-bold text-adaptive-primary group-hover:text-primary transition-colors">
                    {testimonial.name}
                  </CardTitle>
                  <CardDescription className="text-responsive-sm font-medium text-adaptive-secondary">
                    {testimonial.role}
                  </CardDescription>
                  <CardDescription className="text-responsive-xs text-adaptive-muted">
                    {testimonial.company}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-adaptive-secondary italic leading-relaxed text-responsive-lg">
                    "{testimonial.content}"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Statistics Section */}
          <div className="mt-20 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-3xl p-8 md:p-12 text-white">
            <h3 className="text-responsive-3xl font-bold text-center mb-8">
              Results That Speak for Themselves
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-responsive-4xl font-bold mb-2 text-blue-200">
                  95%
                </div>
                <p className="text-blue-100 text-responsive-sm">
                  Improvement in Response Time
                </p>
              </div>
              <div>
                <div className="text-responsive-4xl font-bold mb-2 text-green-200">
                  500+
                </div>
                <p className="text-green-100 text-responsive-sm">
                  Professionals Trained
                </p>
              </div>
              <div>
                <div className="text-responsive-4xl font-bold mb-2 text-yellow-200">
                  24/7
                </div>
                <p className="text-yellow-100 text-responsive-sm">
                  Support Available
                </p>
              </div>
              <div>
                <div className="text-responsive-4xl font-bold mb-2 text-pink-200">
                  100%
                </div>
                <p className="text-pink-100 text-responsive-sm">
                  Satisfaction Guaranteed
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modern Contact Section */}
      <section
        id="contact"
        className="py-24 px-4 bg-gradient-to-br from-muted/50 via-background to-muted/30 relative overflow-hidden"
      >
        {/* Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-full blur-2xl"></div>

        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-responsive-5xl font-bold mb-6 title-adaptive leading-tight">
                  Ready to Transform Your Recruitment?
                </h2>
                <p className="text-adaptive-secondary text-responsive-xl leading-relaxed">
                  Join emergency services across the country who trust CTRL to
                  identify candidates with the right skills and resilience to
                  answer life-saving calls.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center space-x-4 p-4 rounded-2xl contact-item-adaptive">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium text-adaptive-primary text-responsive-base">
                      Phone Support
                    </p>
                    <p className="text-adaptive-secondary text-responsive-sm">
                      +1 (555) 123-4567
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 rounded-2xl contact-item-adaptive">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium text-adaptive-primary text-responsive-base">
                      Email Us
                    </p>
                    <p className="text-adaptive-secondary text-responsive-sm">
                      contact@ctrl-assessment.com
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 rounded-2xl contact-item-adaptive">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium text-adaptive-primary text-responsive-base">
                      Visit Us
                    </p>
                    <p className="text-adaptive-secondary text-responsive-sm">
                      123 Emergency Blvd, Safety City, SC 12345
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="card-adaptive-blur shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardHeader className="pb-6">
                <CardTitle className="text-responsive-2xl font-bold title-adaptive">
                  See CTRL in Action
                </CardTitle>
                <CardDescription className="text-responsive-base text-adaptive-secondary">
                  Experience how CTRL can help you recruit with confidence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="nombre"
                      className="text-responsive-sm font-semibold text-adaptive-primary block mb-2"
                    >
                      First Name
                    </label>
                    <input
                      id="nombre"
                      className="w-full px-4 py-3 border border-border/50 rounded-xl bg-background/50 focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      placeholder="Your first name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="apellido"
                      className="text-responsive-sm font-semibold text-adaptive-primary block mb-2"
                    >
                      Last Name
                    </label>
                    <input
                      id="apellido"
                      className="w-full px-4 py-3 border border-border/50 rounded-xl bg-background/50 focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      placeholder="Your last name"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="text-responsive-sm font-semibold text-adaptive-primary block mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-4 py-3 border border-border/50 rounded-xl bg-background/50 focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label
                    htmlFor="organizacion"
                    className="text-responsive-sm font-semibold text-adaptive-primary block mb-2"
                  >
                    Organization
                  </label>
                  <input
                    id="organizacion"
                    className="w-full px-4 py-3 border border-border/50 rounded-xl bg-background/50 focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    placeholder="Your organization"
                  />
                </div>
                <div>
                  <label
                    htmlFor="message"
                    className="text-responsive-sm font-semibold text-adaptive-primary block mb-2"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    className="w-full px-4 py-3 border border-border/50 rounded-xl bg-background/50 focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 h-32 resize-none"
                    placeholder="Tell us about your recruitment needs..."
                  ></textarea>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-lg font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-background text-foreground hover:bg-accent hover:text-accent-foreground w-full py-3">
                  Request Demo
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* Modern Footer */}
      <footer className="relative bg-adaptive-footer text-adaptive-footer-text overflow-hidden border-t border-adaptive-border">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-48 h-48 bg-gradient-to-br from-accent/10 to-primary/10 rounded-full blur-2xl"></div>
        </div>

        <div className="container mx-auto py-16 px-4 relative z-10">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <Link href="/" className="block">
                  <div className="flex flex-col items-center gap-1 p-2">
                    <img
                      alt="CTRL"
                      className="h-15 w-15 logo-adaptive cursor-pointer transition-transform hover:scale-105"
                      src="./icon1.png"
                    />
                  </div>
                </Link>
              </div>
              <p className="text-adaptive-footer-secondary text-base leading-relaxed max-w-md">
                The trusted standard for assessing and selecting control room
                professionals. Ensuring every emergency call is answered by
                someone with the right skills and resilience.
              </p>

              {/* Social Links or Additional Info */}
              <div className="mt-6 pt-6 border-t border-adaptive-border">
                <p className="text-adaptive-footer-accent text-sm font-medium">
                  🏆 Trusted by 500+ Emergency Services Worldwide
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-adaptive-footer-text font-bold mb-6 text-lg">
                Platform
              </h3>
              <ul className="space-y-3 text-adaptive-footer-secondary">
                <li>
                  <Link
                    href="#features"
                    className="hover:text-adaptive-footer-text transition-colors duration-200 flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-200">
                      Features
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className="hover:text-adaptive-footer-text transition-colors duration-200 flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-200">
                      Dashboard
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/assessment"
                    className="hover:text-adaptive-footer-text transition-colors duration-200 flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-200">
                      Assessments
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/results"
                    className="hover:text-adaptive-footer-text transition-colors duration-200 flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-200">
                      Results
                    </span>
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-adaptive-footer-text font-bold mb-6 text-lg">
                Company
              </h3>
              <ul className="space-y-3 text-adaptive-footer-secondary">
                <li>
                  <Link
                    href="/about"
                    className="hover:text-adaptive-footer-text transition-colors duration-200 flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-200">
                      About
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="#contact"
                    className="hover:text-adaptive-footer-text transition-colors duration-200 flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-200">
                      Contact
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy-policy"
                    className="hover:text-adaptive-footer-text transition-colors duration-200 flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-200">
                      Privacy Policy
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms-conditions"
                    className="hover:text-adaptive-footer-text transition-colors duration-200 flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-200">
                      Terms & Conditions
                    </span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-adaptive-border pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-adaptive-footer-secondary text-sm">
                &copy; {new Date().getFullYear()} CTRL Assessment Platform. All
                rights reserved.
              </p>
              <p className="text-adaptive-footer-accent text-sm font-medium">
                A commitment to public safety through intelligent recruitment.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
