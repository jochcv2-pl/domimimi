import { getTranslations } from "next-intl/server";
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
import { getBrandSettings } from "@/lib/brand";

export default async function Home() {
  const { brandName, logoUrl } = await getBrandSettings();
  const t = await getTranslations("page");

  return (
    <>
      <Navbar brandName={brandName} logoUrl={logoUrl} />
      <Hero />
      <TrustBar />
      <div className="tape">
        <div className="tape-track">
          <span>{t("tape1a")}</span>
          <span>{t("tape1b")}</span>
          <span>{t("tape1c")}</span>
          <span>{t("tape1d")}</span>
          <span>{t("tape1a")}</span>
          <span>{t("tape1b")}</span>
          <span>{t("tape1c")}</span>
          <span>{t("tape1d")}</span>
        </div>
      </div>
      <Benefits />
      <Steps />
      <div className="tape">
        <div className="tape-track">
          <span>{t("tape2a")}</span>
          <span>{t("tape2b")}</span>
          <span>{t("tape2c")}</span>
          <span>{t("tape2d", { brandName })}</span>
          <span>{t("tape2a")}</span>
          <span>{t("tape2b")}</span>
          <span>{t("tape2c")}</span>
          <span>{t("tape2d", { brandName })}</span>
        </div>
      </div>
      <ProfilePay />
      <Testimonials />
      <Faq />
      <ApplyForm />
      <Footer brandName={brandName} logoUrl={logoUrl} />
    </>
  );
}
