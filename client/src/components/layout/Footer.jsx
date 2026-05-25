import { Link } from 'react-router-dom'
import { Pizza, Instagram, Twitter, Facebook, Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-brand-dark text-white mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 font-bold text-2xl text-white mb-3">
              <Pizza size={28} className="text-brand-red" /> PizzaHub
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Handcrafted pizzas made with love, delivered hot to your door.
            </p>
            <div className="flex gap-3 mt-5">
              {[Instagram, Twitter, Facebook].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-brand-red transition-colors">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-widest text-gray-400 mb-4">Menu</h4>
            <ul className="space-y-2.5 text-sm text-gray-300">
              {['Classic Pizzas','Vegetarian','Specialty','Seasonal Picks'].map(l => (
                <li key={l}><Link to="/menu" className="hover:text-white transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm uppercase tracking-widest text-gray-400 mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm text-gray-300">
              {['About Us','Careers','Press','Blog'].map(l => (
                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm uppercase tracking-widest text-gray-400 mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-center gap-2"><MapPin size={14} className="text-brand-red shrink-0" /> 42 Crust Lane, Pizza City</li>
              <li className="flex items-center gap-2"><Phone size={14} className="text-brand-red shrink-0" /> +1 (800) PIZZA-HUB</li>
              <li className="flex items-center gap-2"><Mail size={14} className="text-brand-red shrink-0" /> hello@pizzahub.com</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <span>© 2026 PizzaHub. All rights reserved.</span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
