// English golden set. `expected` is written by hand from APA 7 rules and the
// examples in the Bangkok University guide and APA's own published examples;
// it is never copied from the renderer's output.
import type { Csl } from "../../src/types";

export type Golden = { name: string; raw: string; csl: Csl; expected: string };

const y = (n: number, m?: number, d?: number) => ({ "date-parts": [[n, m, d].filter((v) => v !== undefined)] as [[number]] });

export const english: Golden[] = [
  {
    name: "book, one author, subtitle",
    raw: "Vygotsky L. S. 1978. Mind in society: The development of higher psychological processes. Harvard University Press",
    csl: { type: "book", author: [{ family: "Vygotsky", given: "L. S." }], issued: y(1978), title: "Mind in society: The development of higher psychological processes", publisher: "Harvard University Press" },
    expected: "Vygotsky, L. S. (1978). Mind in society: The development of higher psychological processes. Harvard University Press.",
  },
  {
    name: "book, two authors, edition",
    raw: "Greenberg J and Baron RA (2003) Behavior in Organizations: Understanding and managing the human side of work 18th ed, Prentice-Hall",
    csl: { type: "book", author: [{ family: "Greenberg", given: "J." }, { family: "Baron", given: "R. A." }], issued: y(2003), title: "Behavior in organizations: Understanding and managing the human side of work", edition: "18", publisher: "Prentice-Hall" },
    expected: "Greenberg, J., & Baron, R. A. (2003). Behavior in organizations: Understanding and managing the human side of work (18th ed.). Prentice-Hall.",
  },
  {
    name: "book, four authors, edition",
    raw: "Multivariate Data Analysis, J.F. Hair, W.C. Black, B.J. Babin and R.E. Anderson, Pearson 2010, 7th edition",
    csl: { type: "book", author: [{ family: "Hair", given: "J. F." }, { family: "Black", given: "W. C." }, { family: "Babin", given: "B. J." }, { family: "Anderson", given: "R. E." }], issued: y(2010), title: "Multivariate data analysis", edition: "7", publisher: "Pearson" },
    expected: "Hair, J. F., Black, W. C., Babin, B. J., & Anderson, R. E. (2010). Multivariate data analysis (7th ed.). Pearson.",
  },
  {
    name: "chapter in edited book",
    raw: "Stein, A. (1997). Sex after 'sexuality': From sexology to poststructuralism. In D. Owen (Ed.), Sociology after postmodernism (pp. 158-172). Sage.",
    csl: { type: "chapter", author: [{ family: "Stein", given: "A." }], editor: [{ family: "Owen", given: "D." }], issued: y(1997), title: "Sex after 'sexuality': From sexology to poststructuralism", "container-title": "Sociology after postmodernism", page: "158-172", publisher: "Sage" },
    expected: 'Stein, A. (1997). Sex after "sexuality": From sexology to poststructuralism. In D. Owen (Ed.), Sociology after postmodernism (pp. 158–172). Sage.',
  },
  {
    name: "conference paper in proceedings",
    raw: "Shobhadevi, Y. J. and Bidarakoppa, G. S. 1994, Possession phenomena: As a coping behaviour. In G. Davidson (Ed.), Applying psychology: Lessons from Asia-Oceania, pp. 83-95, Australian Psychological Society",
    csl: { type: "chapter", author: [{ family: "Shobhadevi", given: "Y. J." }, { family: "Bidarakoppa", given: "G. S." }], editor: [{ family: "Davidson", given: "G." }], issued: y(1994), title: "Possession phenomena: As a coping behaviour", "container-title": "Applying psychology: Lessons from Asia-Oceania", page: "83-95", publisher: "Australian Psychological Society" },
    expected: "Shobhadevi, Y. J., & Bidarakoppa, G. S. (1994). Possession phenomena: As a coping behaviour. In G. Davidson (Ed.), Applying psychology: Lessons from Asia-Oceania (pp. 83–95). Australian Psychological Society.",
  },
  {
    name: "chapter with edition and pages",
    raw: "Weinstock R, Leong GB, Silva JA. Defining forensic psychiatry: Roles and responsibilities. In: Rosner R, editor. Principles and practice of forensic psychiatry. 2nd ed. CRC Press; 2003. p. 7-13.",
    csl: { type: "chapter", author: [{ family: "Weinstock", given: "R." }, { family: "Leong", given: "G. B." }, { family: "Silva", given: "J. A." }], editor: [{ family: "Rosner", given: "R." }], issued: y(2003), title: "Defining forensic psychiatry: Roles and responsibilities", "container-title": "Principles and practice of forensic psychiatry", edition: "2", page: "7-13", publisher: "CRC Press" },
    expected: "Weinstock, R., Leong, G. B., & Silva, J. A. (2003). Defining forensic psychiatry: Roles and responsibilities. In R. Rosner (Ed.), Principles and practice of forensic psychiatry (2nd ed., pp. 7–13). CRC Press.",
  },
  {
    name: "journal article, three authors",
    raw: "Kokanuch A, Tantipatum M, Khunsri P. Research and Development of e-Marketplace for Community Enterprises in Loei Province Using the PDCA Process. BU Academic Review 2024;23(2):24-39",
    csl: { type: "article-journal", author: [{ family: "Kokanuch", given: "A." }, { family: "Tantipatum", given: "M." }, { family: "Khunsri", given: "P." }], issued: y(2024), title: "Research and development of e-marketplace for community enterprises in Loei Province using the PDCA process", "container-title": "BU Academic Review", volume: "23", issue: "2", page: "24-39" },
    expected: "Kokanuch, A., Tantipatum, M., & Khunsri, P. (2024). Research and development of e-marketplace for community enterprises in Loei Province using the PDCA process. BU Academic Review, 23(2), 24–39.",
  },
  {
    name: "journal article with DOI, five authors",
    raw: "Grady, J. S., Her, M., Moreno, G., Perez, C., & Yelinek, J. (2019). Emotions in storybooks: A comparison of storybooks that represent ethnic and racial groups in the United States. Psychology of Popular Media Culture, 8(3), 207–217. doi:10.1037/ppm0000185",
    csl: { type: "article-journal", author: [{ family: "Grady", given: "J. S." }, { family: "Her", given: "M." }, { family: "Moreno", given: "G." }, { family: "Perez", given: "C." }, { family: "Yelinek", given: "J." }], issued: y(2019), title: "Emotions in storybooks: A comparison of storybooks that represent ethnic and racial groups in the United States", "container-title": "Psychology of Popular Media Culture", volume: "8", issue: "3", page: "207-217", DOI: "10.1037/ppm0000185" },
    expected: "Grady, J. S., Her, M., Moreno, G., Perez, C., & Yelinek, J. (2019). Emotions in storybooks: A comparison of storybooks that represent ethnic and racial groups in the United States. Psychology of Popular Media Culture, 8(3), 207–217. https://doi.org/10.1037/ppm0000185",
  },
  {
    name: "journal article, no issue",
    raw: "Brown, T. 2015. Learning in groups. Journal of Teaching, vol 12, pages 45-67",
    csl: { type: "article-journal", author: [{ family: "Brown", given: "T." }], issued: y(2015), title: "Learning in groups", "container-title": "Journal of Teaching", volume: "12", page: "45-67" },
    expected: "Brown, T. (2015). Learning in groups. Journal of Teaching, 12, 45–67.",
  },
  {
    name: "master's thesis in a repository",
    raw: "Valentin, E. R. (2019). Narcissism predicted by Snapchat selfie sharing, filter usage, and editing (Master's thesis). California State University Dominguez Hills. CSU ScholarWorks. https://scholarworks.calstate.edu/concern/theses/3197xm925",
    csl: { type: "thesis", genre: "Master's thesis", author: [{ family: "Valentin", given: "E. R." }], issued: y(2019), title: "Narcissism predicted by Snapchat selfie sharing, filter usage, and editing", publisher: "California State University Dominguez Hills", archive: "CSU ScholarWorks", URL: "https://scholarworks.calstate.edu/concern/theses/3197xm925" },
    expected: "Valentin, E. R. (2019). Narcissism predicted by Snapchat selfie sharing, filter usage, and editing [Master's thesis, California State University Dominguez Hills]. CSU ScholarWorks. https://scholarworks.calstate.edu/concern/theses/3197xm925",
  },
  {
    name: "doctoral dissertation",
    raw: "Zambrano-Vazquez L. The interaction of state and trait worry on response monitoring in those with worry and obsessive-compulsive symptoms. Doctoral dissertation, University of Arizona; 2016. UA Campus Repository. https://repository.arizona.edu/handle/10150/620615",
    csl: { type: "thesis", genre: "Doctoral dissertation", author: [{ family: "Zambrano-Vazquez", given: "L." }], issued: y(2016), title: "The interaction of state and trait worry on response monitoring in those with worry and obsessive-compulsive symptoms", publisher: "University of Arizona", archive: "UA Campus Repository", URL: "https://repository.arizona.edu/handle/10150/620615" },
    expected: "Zambrano-Vazquez, L. (2016). The interaction of state and trait worry on response monitoring in those with worry and obsessive-compulsive symptoms [Doctoral dissertation, University of Arizona]. UA Campus Repository. https://repository.arizona.edu/handle/10150/620615",
  },
  {
    name: "group author book with DOI",
    raw: "American Psychological Association (2020). Publication manual of the American Psychological Association, 7th edition. https://doi.org/10.1037/0000165-000",
    csl: { type: "book", author: [{ literal: "American Psychological Association" }], issued: y(2020), title: "Publication manual of the American Psychological Association", edition: "7", DOI: "10.1037/0000165-000" },
    expected: "American Psychological Association. (2020). Publication manual of the American Psychological Association (7th ed.). https://doi.org/10.1037/0000165-000",
  },
  {
    name: "edited book, editor in author position",
    raw: "Hacker Hughes, J. (ed.) 2017, Military veteran psychological health and social care: contemporary approaches, Routledge",
    csl: { type: "book", editor: [{ family: "Hacker Hughes", given: "J." }], issued: y(2017), title: "Military veteran psychological health and social care: Contemporary approaches", publisher: "Routledge" },
    expected: "Hacker Hughes, J. (Ed.). (2017). Military veteran psychological health and social care: Contemporary approaches. Routledge.",
  },
  {
    name: "web page, organisation author, no date",
    raw: "National Aeronautics and Space Administration. (n.d.). Climate change: How do we know?. https://climate.nasa.gov/evidence/",
    csl: { type: "webpage", author: [{ literal: "National Aeronautics and Space Administration" }], issued: { literal: "n.d." }, title: "Climate change: How do we know?", URL: "https://climate.nasa.gov/evidence/" },
    expected: "National Aeronautics and Space Administration. (n.d.). Climate change: How do we know? https://climate.nasa.gov/evidence/",
  },
  {
    name: "web page with full date and site name",
    raw: "Bologna, Caroline. Why some people with anxiety love watching horror movies. HuffPost, 31 October 2019. https://www.huffpost.com/entry/anxiety-love-watching-horror-movies_l_5d277587e4b02a5a5d57b59e",
    csl: { type: "webpage", author: [{ family: "Bologna", given: "C." }], issued: y(2019, 10, 31), title: "Why some people with anxiety love watching horror movies", "container-title": "HuffPost", URL: "https://www.huffpost.com/entry/anxiety-love-watching-horror-movies_l_5d277587e4b02a5a5d57b59e" },
    expected: "Bologna, C. (2019, October 31). Why some people with anxiety love watching horror movies. HuffPost. https://www.huffpost.com/entry/anxiety-love-watching-horror-movies_l_5d277587e4b02a5a5d57b59e",
  },
  {
    name: "book, plain",
    raw: "Sapolsky, Robert M. Behave: the biology of humans at our best and worst. Penguin Books, 2017.",
    csl: { type: "book", author: [{ family: "Sapolsky", given: "R. M." }], issued: y(2017), title: "Behave: The biology of humans at our best and worst", publisher: "Penguin Books" },
    expected: "Sapolsky, R. M. (2017). Behave: The biology of humans at our best and worst. Penguin Books.",
  },
  {
    name: "twenty-one authors: first nineteen, ellipsis, last",
    raw: "Gilbert JR, Smith JD, Johnson RS, Anderson A, Plath S, Martin G, Sorenson K, Jones R, Adams T, Rothbaum Z, Esty K, Gibbs M, Taultson B, Christner G, Paulson L, Tolo K, Jacobson WL, Robinson RA, Maurer O, Doe P, White N. Choosing a title. 2nd ed. Unnamed Publishing; 2014.",
    csl: {
      type: "book",
      author: [
        ["Gilbert", "J. R."], ["Smith", "J. D."], ["Johnson", "R. S."], ["Anderson", "A."], ["Plath", "S."], ["Martin", "G."], ["Sorenson", "K."],
        ["Jones", "R."], ["Adams", "T."], ["Rothbaum", "Z."], ["Esty", "K."], ["Gibbs", "M."], ["Taultson", "B."], ["Christner", "G."],
        ["Paulson", "L."], ["Tolo", "K."], ["Jacobson", "W. L."], ["Robinson", "R. A."], ["Maurer", "O."], ["Doe", "P."], ["White", "N."],
      ].map(([family, given]) => ({ family, given })),
      issued: y(2014), title: "Choosing a title", edition: "2", publisher: "Unnamed Publishing",
    },
    expected: "Gilbert, J. R., Smith, J. D., Johnson, R. S., Anderson, A., Plath, S., Martin, G., Sorenson, K., Jones, R., Adams, T., Rothbaum, Z., Esty, K., Gibbs, M., Taultson, B., Christner, G., Paulson, L., Tolo, K., Jacobson, W. L., Robinson, R. A., Maurer, O., . . . White, N. (2014). Choosing a title (2nd ed.). Unnamed Publishing.",
  },
];

/** Same author and year twice: APA adds a and b by title. Rendered together. */
export const sameAuthorYear: Golden[] = [
  {
    name: "same author-year, second title alphabetically",
    raw: "Han, S. (2021). Zero-shot reading in second languages. Language Learning Today, 4(1), 1-9.",
    csl: { type: "article-journal", author: [{ family: "Han", given: "S." }], issued: y(2021), title: "Zero-shot reading in second languages", "container-title": "Language Learning Today", volume: "4", issue: "1", page: "1-9" },
    expected: "Han, S. (2021b). Zero-shot reading in second languages. Language Learning Today, 4(1), 1–9.",
  },
  {
    name: "same author-year, first title alphabetically",
    raw: "Han, S. (2021). Attention in bilingual readers. Language Learning Today, 4(2), 10-20.",
    csl: { type: "article-journal", author: [{ family: "Han", given: "S." }], issued: y(2021), title: "Attention in bilingual readers", "container-title": "Language Learning Today", volume: "4", issue: "2", page: "10-20" },
    expected: "Han, S. (2021a). Attention in bilingual readers. Language Learning Today, 4(2), 10–20.",
  },
];
