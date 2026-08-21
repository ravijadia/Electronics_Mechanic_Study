function googleTranslateElementInit() {
  new google.translate.TranslateElement(
    {
      pageLanguage: 'en',
      includedLanguages: 'gu',
      layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
    },
    'google_translate_element',
  );
}
