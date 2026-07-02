export const FATORZ_WHATSAPP_NUMBER = "5553991456249";

export const FATORZ_WHATSAPP_URL =
  "https://wa.me/5553991456249?text=Quero%20falar%20com%20a%20FatorZ%20sobre%20minha%20marca";

export const FATORZ_DIAGNOSTIC_WHATSAPP_URL =
  "https://wa.me/5553991456249?text=Quero%20fazer%20um%20diagnostico%20de%20perfil%20com%20a%20FatorZ";

export const FATORZ_INSTAGRAM_URL = "https://www.instagram.com/fatorzhouse/";
export const FATORZ_FACEBOOK_URL = "https://www.facebook.com/FatorZHouse";

export function buildProductWhatsAppUrl(productName: string) {
  return `https://wa.me/${FATORZ_WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Quero contratar ${productName} pela FatorZ.`
  )}`;
}
