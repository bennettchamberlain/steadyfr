import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-950 border-t border-gray-800 relative">
      <div className="container relative py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold text-white mb-2">Steady Fence & Railing</h3>
            <p className="text-gray-400 text-sm">San Francisco Bay Area</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/services" className="text-gray-400 hover:text-white transition-colors">
              Services
            </Link>
            <Link href="/gallery" className="text-gray-400 hover:text-white transition-colors">
              Gallery
            </Link>
            <Link href="/quote" className="text-gray-400 hover:text-white transition-colors">
              Get a Quote
            </Link>
            <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
              Contact
            </Link>
          </nav>
          <div className="text-center md:text-right">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Steady Fence & Railing
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
