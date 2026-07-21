import Navbar from "@/components/sections/Navbar";
import Hero from "@/components/sections/Hero";
import TrustBar from "@/components/sections/TrustBar";
import Benefits from "@/components/sections/Benefits";
import Steps from "@/components/sections/Steps";
import ProfilePay from "@/components/sections/ProfilePay";
import Testimonials from "@/components/sections/Testimonials";
import Faq from "@/components/sections/Faq";
import ApplyForm from "@/components/sections/ApplyForm";
import Footer from "@/components/sections/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <TrustBar />
      <div className="tape">
        <div className="tape-track">
          <span>Manipuler avec soin</span>
          <span>·</span>
          <span>Fragile</span>
          <span>·</span>
          <span>Emballé à la main</span>
          <span>·</span>
          <span>Made in maison</span>
          <span>·</span>
          <span>Manipuler avec soin</span>
          <span>·</span>
          <span>Fragile</span>
          <span>·</span>
          <span>Emballé à la main</span>
          <span>·</span>
          <span>Made in maison</span>
          <span>·</span>
        </div>
      </div>
      <Benefits />
      <Steps />
      <div className="tape">
        <div className="tape-track">
          <span>Ne pas plier</span>
          <span>·</span>
          <span>Ce côté vers le haut</span>
          <span>·</span>
          <span>Colis prêt</span>
          <span>·</span>
          <span>Domipack</span>
          <span>·</span>
          <span>Ne pas plier</span>
          <span>·</span>
          <span>Ce côté vers le haut</span>
          <span>·</span>
          <span>Colis prêt</span>
          <span>·</span>
          <span>Domipack</span>
          <span>·</span>
        </div>
      </div>
      <ProfilePay />
      <Testimonials />
      <Faq />
      <ApplyForm />
      <Footer />
    </>
  );
}
