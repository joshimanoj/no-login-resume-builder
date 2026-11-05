import type { CSSProperties, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Mail, Phone, Globe, Linkedin, Calendar, User, GraduationCap, Briefcase, LayoutGrid, FolderKanban, Trophy, Award, BadgeCheck, BookOpen, type LucideIcon } from "lucide-react";
import { ResumeData } from "./ResumeBuilder";
import { CONTACT_LINKEDIN_LABEL, CONTACT_WEBSITE_LABEL, educationEntryLines, formatContactLine, formatDateRange, formatPlace, formatResumeDate, isRichTextEmpty } from "@/utils/resumeRules";

interface ResumePreviewProps {
  resumeData: ResumeData;
  template: string;
}

export const ResumePreview = ({ resumeData, template }: ResumePreviewProps) => {
  const formatDate = formatResumeDate;
  const namedSkills = resumeData.skills.filter((skill) => skill.name.trim());

  const externalHref = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const publicationLink = (link: string | undefined, className: string, tag: "p" | "div" = "p", style?: CSSProperties) => {
    const text = link?.trim();
    if (!text) return null;
    const href = externalHref(text);
    if (!href) return null;
    const Tag = tag;
    return (
      <Tag className={className} style={style}>
        <a href={href} style={{ color: "inherit" }}>{text}</a>
      </Tag>
    );
  };

  const renderExpiry = (expiryDate?: string) => {
    const formatted = formatDate(expiryDate);
    if (!formatted) return null;
    return <div>Expires: {formatted}</div>;
  };

  const mailtoHref = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return /^mailto:/i.test(trimmed) ? trimmed : `mailto:${trimmed}`;
  };

  const renderMaybeLink = (value: string, href?: string) =>
    href ? <a href={href} className="text-inherit">{value}</a> : <span>{value}</span>;

  const linkifyContactLine = (line: string, linkClass = "text-blue-700") => {
    const info = resumeData.personalInfo;
    const candidates: { text: string; href: string; icon?: LucideIcon }[] = [];
    const email = info.email?.trim();
    const emailHref = email ? mailtoHref(info.email ?? "") : undefined;
    if (email && emailHref) candidates.push({ text: email, href: emailHref });
    const website = info.website?.trim();
    const websiteHref = website ? externalHref(info.website ?? "") : undefined;
    if (website && websiteHref) candidates.push({ text: CONTACT_WEBSITE_LABEL, href: websiteHref, icon: Globe });
    const linkedin = info.linkedin?.trim();
    const linkedinHref = linkedin ? externalHref(info.linkedin ?? "") : undefined;
    if (linkedin && linkedinHref) candidates.push({ text: CONTACT_LINKEDIN_LABEL, href: linkedinHref, icon: Linkedin });
    if (!line || candidates.length === 0) return line;

    const spans: { start: number; end: number; href: string; text: string; icon?: LucideIcon }[] = [];
    for (const candidate of candidates) {
      let from = 0;
      while (from < line.length) {
        const start = line.indexOf(candidate.text, from);
        if (start === -1) break;
        spans.push({
          start,
          end: start + candidate.text.length,
          href: candidate.href,
          text: candidate.text,
          icon: candidate.icon,
        });
        from = start + candidate.text.length;
      }
    }
    spans.sort((a, b) => a.start - b.start || b.end - a.end);

    const nodes: ReactNode[] = [];
    let pos = 0;
    spans.forEach((span, index) => {
      if (span.start < pos) return;
      if (span.start > pos) nodes.push(line.slice(pos, span.start));
      const Icon = span.icon;
      nodes.push(
        <a
          key={`${span.start}-${index}`}
          href={span.href}
          className={Icon ? `inline-flex items-center gap-1 underline ${linkClass}` : "text-inherit"}
        >
          {Icon ? <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden /> : null}
          {span.text}
        </a>
      );
      pos = span.end;
    });
    if (pos < line.length) nodes.push(line.slice(pos));
    return nodes;
  };

  const renderPairedSkills = (
    boxed: boolean,
    nameClass: string,
    levelClass: string
  ) => (
    <div className={boxed ? "unified-skills-boxed" : "unified-skills-grid"}>
      {namedSkills.map((skill) => (
        <div key={skill.id}>
          <span className={nameClass}>{skill.name}</span>
          <span className={levelClass}>{boxed ? skill.level : `(${skill.level})`}</span>
        </div>
      ))}
    </div>
  );

  const renderIconContactRow = (tone: "muted" | "creative" | "onDark" = "muted") => {
    const p = resumeData.personalInfo;
    const color = tone === "onDark" ? "text-gray-200" : "text-gray-600";
    const link = tone === "onDark" ? "text-sky-200" : tone === "creative" ? "text-violet-700" : "text-blue-700";
    const items: { key: string; Icon: typeof Mail; value: string; cls: string; href?: string; web?: boolean }[] = [];
    if (p.email) items.push({ key: "email", Icon: Mail, value: p.email, cls: color, href: mailtoHref(p.email) });
    if (p.phone) items.push({ key: "phone", Icon: Phone, value: p.phone, cls: color });
    if (p.location) items.push({ key: "location", Icon: MapPin, value: p.location, cls: color });
    if (p.website) items.push({ key: "website", Icon: Globe, value: CONTACT_WEBSITE_LABEL, cls: link, href: externalHref(p.website), web: true });
    if (p.linkedin) items.push({ key: "linkedin", Icon: Linkedin, value: CONTACT_LINKEDIN_LABEL, cls: link, href: externalHref(p.linkedin), web: true });
    if (!items.length) return null;
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {items.map(({ key, Icon, value, cls, href, web }) => (
          <div key={key} className={`flex items-center gap-1 ${cls}`}>
            {web && href ? (
              <a href={href} className="inline-flex items-center gap-1 underline">
                <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                {value}
              </a>
            ) : (
              <>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {renderMaybeLink(value, href)}
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderTextContactRow = (align: "left" | "center" = "left") => {
    const line = formatContactLine(resumeData.personalInfo, "classic");
    if (!line) return null;
    return (
      <p className={`text-sm text-gray-600 ${align === "center" ? "text-center" : ""}`}>
        {linkifyContactLine(line)}
      </p>
    );
  };

  const renderEducationEntry = (
    edu: ResumeData["education"][number],
    options: {
      dateSeparator: string;
      degreeClass: string;
      placeClass: string;
      fieldClass: string;
      scoreClass: string;
      dateClass: string;
      showCalendar?: boolean;
      calendarClass?: string;
    }
  ) => {
    const lines = educationEntryLines(edu);
    const dateText = formatDateRange(edu.startDate, edu.endDate, edu.current, options.dateSeparator, "Pursuing");
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className={options.degreeClass}>
            {lines.degree}{lines.place && (
              <span className={`font-normal ${options.placeClass}`}>
                {lines.degree ? ", " : ""}{lines.place}
              </span>
            )}
          </h3>
          {lines.field && <p className={`italic text-sm ${options.fieldClass}`}>{lines.field}</p>}
        </div>
        {(dateText || lines.score) && (
          <div className="shrink-0 text-right">
            {dateText && (
              <div className={`flex items-center justify-end gap-1 ${options.dateClass}`}>
                {options.showCalendar && <Calendar className={options.calendarClass || "w-3 h-3"} />}
                <span>{dateText}</span>
              </div>
            )}
            {lines.score && <div className={`text-sm ${options.scoreClass}`}>{lines.score}</div>}
          </div>
        )}
      </div>
    );
  };

  const renderModernTemplate = () => (
    <div className="unified-resume bg-white p-8 text-gray-900 text-sm leading-relaxed">
      {/* Header */}
      <header className="mb-1">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {resumeData.personalInfo.fullName || "Your Name"}
          </h1>
          {resumeData.personalInfo.photo && (
            <img
              src={resumeData.personalInfo.photo}
              alt="Profile"
              className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200"
            />
          )}
        </div>
        {renderIconContactRow()}
      </header>

      {/* Professional Summary */}
      {resumeData.personalInfo.summary && (
        <section className="mb-0">
          <h2 className="modern-section-header">
            Professional Summary
          </h2>
          <div 
            className="text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: resumeData.personalInfo.summary }}
          />
        </section>
      )}

      {/* Experience */}
      {resumeData.experience.length > 0 && (
        <section className="mb-0">
          <h2 className="modern-section-header">
            Professional Experience
          </h2>
          <div className="space-y-3">
            {resumeData.experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-semibold text-gray-900">{exp.position}</h3>
                    <p className="text-gray-700 font-medium">{formatPlace(exp.company, exp.location)}</p>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {formatDate(exp.startDate)} - {exp.current ? "Present" : formatDate(exp.endDate)}
                      </span>
                    </div>
                  </div>
                </div>
                {exp.description && (
                  <div 
                    className="text-gray-700 mt-0.5 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: exp.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {resumeData.education.length > 0 && (
        <section className="mb-0">
          <h2 className="modern-section-header">
            Education
          </h2>
          <div className="space-y-3">
            {resumeData.education.map((edu) => (
              <div key={edu.id}>
                {renderEducationEntry(edu, {
                  dateSeparator: " - ",
                  degreeClass: "font-semibold text-gray-900",
                  placeClass: "text-gray-700",
                  fieldClass: "text-gray-600",
                  scoreClass: "text-gray-600",
                  dateClass: "text-sm text-gray-600",
                  showCalendar: true,
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {namedSkills.length > 0 && (
        <section className="mb-0">
          <h2 className="modern-section-header">
            Skills
          </h2>
          {renderPairedSkills(true, "text-gray-700", "text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded")}
        </section>
      )}

      {/* Projects */}
      {resumeData.projects && resumeData.projects.length > 0 && (
        <section className="mb-0">
          <h2 className="modern-section-header">
            Projects
          </h2>
          <div className="space-y-3">
            {resumeData.projects.map((project) => (
              <div key={project.id}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  {project.date && (
                    <span className="text-blue-600 text-sm">{formatDate(project.date)}</span>
                  )}
                </div>
                {project.technologies && (
                  <p className="text-gray-600 text-sm mb-1">
                    <strong>Technologies:</strong> {project.technologies}
                  </p>
                )}
                {project.description && (
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: project.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Achievements */}
      {resumeData.achievements && resumeData.achievements.length > 0 && (
        <section className="mb-0">
          <h2 className="modern-section-header">
            Achievements
          </h2>
          <div className="space-y-3">
            {resumeData.achievements.map((achievement) => (
              <div key={achievement.id}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-gray-900">{achievement.title}</h3>
                  {achievement.date && (
                    <span className="text-sm text-gray-600">{formatDate(achievement.date)}</span>
                  )}
                </div>
                {achievement.description && (
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: achievement.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Awards */}
      {resumeData.awards && resumeData.awards.length > 0 && (
        <section className="mb-0">
          <h2 className="modern-section-header">
            Awards
          </h2>
          <div className="space-y-3">
            {resumeData.awards.map((award) => (
              <div key={award.id}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-semibold text-gray-900">{award.title}</h3>
                    <p className="text-gray-700 font-medium">{award.issuer}</p>
                  </div>
                  <span className="text-sm text-gray-600">{formatDate(award.date)}</span>
                </div>
                {award.description && (
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: award.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {resumeData.certifications && resumeData.certifications.length > 0 && (
        <section className="mb-0">
          <h2 className="modern-section-header">
            Courses & Certifications
          </h2>
          <div className="space-y-3">
            {resumeData.certifications.map((cert) => (
              <div key={cert.id}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-semibold text-gray-900">{cert.name}</h3>
                    <p className="text-gray-700 font-medium">{cert.issuer}</p>
                    {cert.credentialId && <p className="text-gray-600 text-sm">ID: {cert.credentialId}</p>}
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div>{formatDate(cert.date)}</div>
                    {renderExpiry(cert.expiryDate)}
                  </div>
                </div>
                {!isRichTextEmpty(cert.description) && (
                  <div
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: cert.description! }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Publications */}
      {resumeData.publications && resumeData.publications.length > 0 && (
        <section className="mb-0">
          <h2 className="modern-section-header">
            Publications
          </h2>
          <div className="space-y-3">
            {resumeData.publications.map((pub) => (
              <div key={pub.id}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-semibold text-gray-900">{pub.title}</h3>
                    <p className="text-gray-700 font-medium">{pub.journal}</p>
                    {pub.authors && <p className="text-gray-600 text-sm">Authors: {pub.authors}</p>}
                    {publicationLink(pub.link, "text-blue-600 text-sm")}
                  </div>
                  <span className="text-sm text-gray-600">{formatDate(pub.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  const renderClassicTemplate = () => (
    <div className="unified-resume bg-white p-8 text-gray-900 text-sm leading-relaxed">
      {/* Header */}
      <header className="text-center pb-2 border-b-2 border-gray-300">
        <div className="flex flex-col items-center">
          {resumeData.personalInfo.photo && (
            <div className="mb-2">
              <img
                src={resumeData.personalInfo.photo}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
              />
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {resumeData.personalInfo.fullName || "Your Name"}
          </h1>
          {renderTextContactRow("center")}
        </div>
      </header>

      {/* Objective/Summary */}
      {resumeData.personalInfo.summary && (
        <section className="mb-0">
          <h2 className="classic-section-header">
            Objective
          </h2>
          <div 
            className="text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: resumeData.personalInfo.summary }}
          />
        </section>
      )}

      {/* Experience */}
      {resumeData.experience.length > 0 && (
        <section className="mb-0">
          <h2 className="classic-section-header">
            Professional Experience
          </h2>
          <div className="space-y-3">
            {resumeData.experience.map((exp) => (
              <div key={exp.id}>
                <div className="mb-1">
                  <h3 className="font-bold text-gray-900">{exp.position}</h3>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">{formatPlace(exp.company, exp.location)}</span>
                    <span className="text-gray-600">
                      {formatDate(exp.startDate)} - {exp.current ? "Present" : formatDate(exp.endDate)}
                    </span>
                  </div>
                </div>
                {exp.description && (
                  <div 
                    className="text-gray-700 mt-0.5 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: exp.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {resumeData.education.length > 0 && (
        <section className="mb-0">
          <h2 className="classic-section-header">
            Education
          </h2>
          <div className="space-y-3">
            {resumeData.education.map((edu) => (
              <div key={edu.id}>
                {renderEducationEntry(edu, {
                  dateSeparator: " - ",
                  degreeClass: "font-bold text-gray-900",
                  placeClass: "text-gray-700",
                  fieldClass: "text-gray-600",
                  scoreClass: "text-gray-600",
                  dateClass: "text-gray-600",
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {namedSkills.length > 0 && (
        <section className="mb-0">
          <h2 className="classic-section-header">
            Skills
          </h2>
          {renderPairedSkills(false, "text-gray-700", "text-gray-600")}
        </section>
      )}

      {/* Projects */}
      {resumeData.projects && resumeData.projects.length > 0 && (
        <section className="mb-0">
          <h2 className="classic-section-header">
            Projects
          </h2>
          <div className="space-y-3">
            {resumeData.projects.map((project) => (
              <div key={project.id}>
                <div className="mb-1">
                  <h3 className="font-bold text-gray-900">{project.name}</h3>
                  {project.date && (
                    <p className="text-blue-600 text-sm">{formatDate(project.date)}</p>
                  )}
                </div>
                {project.technologies && (
                  <p className="text-gray-600 text-sm mb-1">
                    <strong>Technologies:</strong> {project.technologies}
                  </p>
                )}
                {project.description && (
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: project.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Achievements */}
      {resumeData.achievements && resumeData.achievements.length > 0 && (
        <section className="mb-0">
          <h2 className="classic-section-header">
            Achievements
          </h2>
          <div className="space-y-3">
            {resumeData.achievements.map((achievement) => (
              <div key={achievement.id}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-gray-900">{achievement.title}</h3>
                  {achievement.date && (
                    <span className="text-gray-600">{formatDate(achievement.date)}</span>
                  )}
                </div>
                {achievement.description && (
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: achievement.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Awards */}
      {resumeData.awards && resumeData.awards.length > 0 && (
        <section className="mb-0">
          <h2 className="classic-section-header">
            Awards
          </h2>
          <div className="space-y-3">
            {resumeData.awards.map((award) => (
              <div key={award.id}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-bold text-gray-900">{award.title}</h3>
                    <div className="text-gray-600 text-sm">{award.issuer}</div>
                  </div>
                  <span className="text-gray-600">{formatDate(award.date)}</span>
                </div>
                {award.description && (
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: award.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {resumeData.certifications && resumeData.certifications.length > 0 && (
        <section className="mb-0">
          <h2 className="classic-section-header">
            Courses & Certifications
          </h2>
          <div className="space-y-3">
            {resumeData.certifications.map((cert) => (
              <div key={cert.id}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-bold text-gray-900">{cert.name}</h3>
                    <div className="text-gray-600 text-sm">{cert.issuer}</div>
                    {cert.credentialId && (
                      <div className="text-gray-600 text-sm">ID: {cert.credentialId}</div>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div>{formatDate(cert.date)}</div>
                    {renderExpiry(cert.expiryDate)}
                  </div>
                </div>
                {!isRichTextEmpty(cert.description) && (
                  <div
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: cert.description! }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Publications */}
      {resumeData.publications && resumeData.publications.length > 0 && (
        <section className="mb-0">
          <h2 className="classic-section-header">
            Publications
          </h2>
          <div className="space-y-3">
            {resumeData.publications.map((pub) => (
              <div key={pub.id}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-bold text-gray-900">{pub.title}</h3>
                    <div className="text-gray-600 text-sm">{pub.journal}</div>
                    {pub.authors && (
                      <div className="text-gray-600 text-sm">Authors: {pub.authors}</div>
                    )}
                    {publicationLink(pub.link, "text-blue-600 text-sm", "div")}
                  </div>
                  <span className="text-gray-600 text-sm">{formatDate(pub.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  const renderMinimalTemplate = () => (
    <div className="unified-resume bg-white p-8 text-gray-800 text-sm leading-relaxed">
      {/* Header */}
      <header className="mb-1">
        <h1 className="text-2xl font-light text-gray-900 mb-1 tracking-wide">
          {resumeData.personalInfo.fullName || "Your Name"}
        </h1>
        {renderTextContactRow()}
      </header>

      {/* Summary */}
      {resumeData.personalInfo.summary && (
        <section className="mb-0">
          <h2 className="minimal-section-header">
            Summary
          </h2>
          <div 
            className="text-gray-700 leading-relaxed italic"
            dangerouslySetInnerHTML={{ __html: resumeData.personalInfo.summary }}
          />
        </section>
      )}

      {/* Experience */}
      {resumeData.experience.length > 0 && (
        <section className="mb-0">
          <h2 className="minimal-section-header">
            Experience
          </h2>
          <div className="space-y-3">
            {resumeData.experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium text-gray-900">{exp.position}</h3>
                  <span className="text-gray-600 text-sm">
                    {formatDate(exp.startDate)} - {exp.current ? "Present" : formatDate(exp.endDate)}
                  </span>
                </div>
                <p className="text-gray-600 mb-1">{formatPlace(exp.company, exp.location)}</p>
                {exp.description && (
                  <div 
                    className="text-gray-700 leading-relaxed mt-0.5"
                    dangerouslySetInnerHTML={{ __html: exp.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {resumeData.education.length > 0 && (
        <section className="mb-0">
          <h2 className="minimal-section-header">
            Education
          </h2>
          <div className="space-y-3">
            {resumeData.education.map((edu) => (
              <div key={edu.id}>
                {renderEducationEntry(edu, {
                  dateSeparator: " - ",
                  degreeClass: "font-semibold text-gray-900",
                  placeClass: "text-gray-600",
                  fieldClass: "text-gray-600",
                  scoreClass: "text-gray-600",
                  dateClass: "text-sm text-gray-600",
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {namedSkills.length > 0 && (
        <section className="mb-0">
          <h2 className="minimal-section-header">
            Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {namedSkills.map((skill) => (
              <span key={skill.id} className="text-gray-700">
                {skill.name}
                {skill.id !== namedSkills[namedSkills.length - 1].id && ","}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {resumeData.projects && resumeData.projects.length > 0 && (
        <section className="mb-0">
          <h2 className="minimal-section-header">
            Projects
          </h2>
          <div className="space-y-3">
            {resumeData.projects.map((project) => (
              <div key={project.id}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium text-gray-900">{project.name}</h3>
                  {project.date && (
                    <span className="text-gray-600 text-sm">{formatDate(project.date)}</span>
                  )}
                </div>

                {project.technologies && (
                  <div className="text-gray-600 mb-1.5">
                    <span className="font-medium">Technologies:</span> {project.technologies}
                  </div>
                )}
                {project.description && (
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: project.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Achievements */}
      {resumeData.achievements && resumeData.achievements.length > 0 && (
        <section className="mb-0">
          <h2 className="minimal-section-header">
            Achievements
          </h2>
          <div className="space-y-3">
            {resumeData.achievements.map((achievement) => (
              <div key={achievement.id}>
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className="font-medium text-gray-900">{achievement.title}</h3>
                  {achievement.date && (
                    <span className="text-gray-600 text-sm">{formatDate(achievement.date)}</span>
                  )}
                </div>
                {achievement.description && (
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: achievement.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Awards */}
      {resumeData.awards && resumeData.awards.length > 0 && (
        <section className="mb-0">
          <h2 className="minimal-section-header">
            Awards
          </h2>
          <div className="space-y-3">
            {resumeData.awards.map((award) => (
              <div key={award.id}>
                <div className="flex justify-between items-start mb-0.5">
                  <div>
                    <h3 className="font-medium text-gray-900">{award.title}</h3>
                    <div className="text-gray-600 text-sm">{award.issuer}</div>
                  </div>
                  <span className="text-gray-600 text-sm">{formatDate(award.date)}</span>
                </div>
                {award.description && (
                  <div 
                    className="text-gray-700 leading-relaxed mt-0.5"
                    dangerouslySetInnerHTML={{ __html: award.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {resumeData.certifications && resumeData.certifications.length > 0 && (
        <section className="mb-0">
          <h2 className="minimal-section-header">
            Certifications
          </h2>
          <div className="space-y-3">
            {resumeData.certifications.map((cert) => (
              <div key={cert.id}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-medium text-gray-900">{cert.name}</h3>
                    <div className="text-gray-600 text-sm">{cert.issuer}</div>
                    {cert.credentialId && (
                      <div className="text-gray-600 text-sm">ID: {cert.credentialId}</div>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div>{formatDate(cert.date)}</div>
                    {renderExpiry(cert.expiryDate)}
                  </div>
                </div>
                {!isRichTextEmpty(cert.description) && (
                  <div
                    className="text-gray-700 leading-relaxed mt-0.5"
                    dangerouslySetInnerHTML={{ __html: cert.description! }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Publications */}
      {resumeData.publications && resumeData.publications.length > 0 && (
        <section className="mb-0">
          <h2 className="minimal-section-header">
            Publications
          </h2>
          <div className="space-y-3">
            {resumeData.publications.map((pub) => (
              <div key={pub.id}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-medium text-gray-900">{pub.title}</h3>
                    <div className="text-gray-600 text-sm">{pub.journal}</div>
                    {pub.authors && (
                      <div className="text-gray-600 text-sm">Authors: {pub.authors}</div>
                    )}
                    {publicationLink(pub.link, "text-blue-600 text-sm", "div")}
                  </div>
                  <span className="text-gray-600 text-sm">{formatDate(pub.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  const renderProfessionalTemplate = () => (
    <div className="unified-resume bg-white p-8 text-gray-900 text-sm leading-relaxed">
      {/* Header */}
      <header className="mb-1 border-b-2 border-gray-200 pb-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {resumeData.personalInfo.fullName || "Your Name"}
          </h1>
          {resumeData.personalInfo.photo && (
            <img
              src={resumeData.personalInfo.photo}
              alt="Profile"
              className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200"
            />
          )}
        </div>
        {renderIconContactRow()}
      </header>

      {/* Professional Summary */}
      {resumeData.personalInfo.summary && (
        <section className="mb-0">
          <h2 className="professional-section-header">
            Professional Summary
          </h2>
          <div 
            className="text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: resumeData.personalInfo.summary }}
          />
        </section>
      )}

      {/* Experience */}
      {resumeData.experience.length > 0 && (
        <section className="mb-0">
          <h2 className="professional-section-header">
            Professional Experience
          </h2>
          <div className="space-y-3">
            {resumeData.experience.map((exp) => (
              <div key={exp.id} >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-semibold text-gray-900">{exp.position}</h3>
                    <p className="text-gray-700 font-medium">{formatPlace(exp.company, exp.location)}</p>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {formatDate(exp.startDate)} - {exp.current ? "Present" : formatDate(exp.endDate)}
                      </span>
                    </div>
                  </div>
                </div>
                {exp.description && (
                  <div 
                    className="text-gray-700 mt-0.5 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: exp.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {resumeData.education.length > 0 && (
        <section className="mb-0">
          <h2 className="professional-section-header">
            Education
          </h2>
          <div className="space-y-3">
            {resumeData.education.map((edu) => (
              <div key={edu.id} >
                {renderEducationEntry(edu, {
                  dateSeparator: " - ",
                  degreeClass: "font-semibold text-gray-900",
                  placeClass: "text-gray-700",
                  fieldClass: "text-gray-600",
                  scoreClass: "text-gray-600",
                  dateClass: "text-sm text-gray-600",
                  showCalendar: true,
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {namedSkills.length > 0 && (
        <section className="mb-0">
          <h2 className="professional-section-header">
            Core Competencies
          </h2>
          {renderPairedSkills(true, "text-gray-700", "text-sm text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded")}
        </section>
      )}

      {/* Projects */}
      {resumeData.projects && resumeData.projects.length > 0 && (
        <section className="mb-0">
          <h2 className="professional-section-header">
            Key Projects
          </h2>
          <div className="space-y-3">
            {resumeData.projects.map((project) => (
              <div key={project.id} >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  {project.date && (
                    <span className="text-gray-600 text-sm">{formatDate(project.date)}</span>
                  )}
                </div>
                {project.technologies && (
                  <p className="text-gray-600 text-sm mb-1.5">
                    <strong>Technologies:</strong> {project.technologies}
                  </p>
                )}
                {project.description && (
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: project.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Achievements */}
      {resumeData.achievements && resumeData.achievements.length > 0 && (
        <section className="mb-0">
          <h2 className="professional-section-header">
            Key Achievements
          </h2>
          <div className="space-y-3">
            {resumeData.achievements.map((achievement) => (
              <div key={achievement.id} >
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className="font-semibold text-gray-900">{achievement.title}</h3>
                  {achievement.date && (
                    <span className="text-sm text-gray-600">{formatDate(achievement.date)}</span>
                  )}
                </div>
                {achievement.description && (
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: achievement.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Awards */}
      {resumeData.awards && resumeData.awards.length > 0 && (
        <section className="mb-0">
          <h2 className="professional-section-header">
            Awards & Recognition
          </h2>
          <div className="space-y-3">
            {resumeData.awards.map((award) => (
              <div key={award.id} >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-semibold text-gray-900">{award.title}</h3>
                    <p className="text-gray-700 font-medium">{award.issuer}</p>
                  </div>
                  <span className="text-sm text-gray-600">{formatDate(award.date)}</span>
                </div>
                {award.description && (
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: award.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {resumeData.certifications && resumeData.certifications.length > 0 && (
        <section className="mb-0">
          <h2 className="professional-section-header">
            Professional Certifications
          </h2>
          <div className="space-y-3">
            {resumeData.certifications.map((cert) => (
              <div key={cert.id} >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-semibold text-gray-900">{cert.name}</h3>
                    <p className="text-gray-700 font-medium">{cert.issuer}</p>
                    {cert.credentialId && <p className="text-gray-600 text-sm">ID: {cert.credentialId}</p>}
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div>{formatDate(cert.date)}</div>
                    {renderExpiry(cert.expiryDate)}
                  </div>
                </div>
                {!isRichTextEmpty(cert.description) && (
                  <div
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: cert.description! }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Publications */}
      {resumeData.publications && resumeData.publications.length > 0 && (
        <section className="mb-0">
          <h2 className="professional-section-header">
            Publications
          </h2>
          <div className="space-y-3">
            {resumeData.publications.map((pub) => (
              <div key={pub.id} >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-semibold text-gray-900">{pub.title}</h3>
                    <p className="text-gray-700 font-medium">{pub.journal}</p>
                    {pub.authors && <p className="text-gray-600 text-sm">Authors: {pub.authors}</p>}
                    {publicationLink(pub.link, "text-blue-600 text-sm")}
                  </div>
                  <span className="text-sm text-gray-600">{formatDate(pub.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  const renderCreativeTemplate = () => (
    <div className="creative-resume text-sm leading-relaxed">
      <header className="creative-masthead">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1>{resumeData.personalInfo.fullName || "Your Name"}</h1>
            <div className="creative-contact">{renderIconContactRow("creative")}</div>
          </div>
          {resumeData.personalInfo.photo && (
            <div className="creative-photo">
              <img src={resumeData.personalInfo.photo} alt="Profile" />
            </div>
          )}
        </div>
      </header>
      <div className="creative-body">
      {resumeData.personalInfo.summary && (
        <section className="mb-0">
          <h2 className="creative-section-header">About Me</h2>
          <div
            className="text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: resumeData.personalInfo.summary }}
          />
        </section>
      )}
      {resumeData.experience.length > 0 && (
        <section className="mb-0">
          <h2 className="creative-section-header">Work Experience</h2>
          <div className="space-y-3">
            {resumeData.experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-semibold text-gray-900">{exp.position}</h3>
                    <p className="text-gray-700 font-medium">{formatPlace(exp.company, exp.location)}</p>
                  </div>
                  <span className="creative-date text-sm shrink-0">
                    {formatDateRange(exp.startDate, exp.endDate, exp.current, " - ")}
                  </span>
                </div>
                {exp.description && (
                  <div
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: exp.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {resumeData.education.length > 0 && (
        <section className="mb-0">
          <h2 className="creative-section-header">
            Education
          </h2>
          <div className="space-y-3">
            {resumeData.education.map((edu) => (
              <div key={edu.id}>
                {renderEducationEntry(edu, {
                  dateSeparator: " - ",
                  degreeClass: "font-semibold text-gray-900",
                  placeClass: "text-gray-700",
                  fieldClass: "text-gray-600",
                  scoreClass: "text-gray-600",
                  dateClass: "text-sm creative-date",
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {namedSkills.length > 0 && (
        <section className="mb-0">
          <h2 className="creative-section-header">
            Skills & Expertise
          </h2>
          <div className="creative-skills flex flex-wrap gap-2">
            {namedSkills.map((skill) => (
              <span key={skill.id} className="creative-skill">
                {skill.name} ({skill.level})
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {resumeData.projects && resumeData.projects.length > 0 && (
        <section className="mb-0">
          <h2 className="creative-section-header">
            Creative Projects
          </h2>
          <div className="space-y-3">
            {resumeData.projects.map((project) => (
              <div key={project.id}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  {project.date && (
                    <span className="creative-date text-sm">{formatDate(project.date)}</span>
                  )}
                </div>
                {project.technologies && (
                  <p className="text-gray-600 text-sm mb-1">
                    <strong>Technologies:</strong> {project.technologies}
                  </p>
                )}
                {project.description && (
                  <div
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: project.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Achievements */}
      {resumeData.achievements && resumeData.achievements.length > 0 && (
        <section className="mb-0">
          <h2 className="creative-section-header">
            Achievements
          </h2>
          <div className="space-y-3">
            {resumeData.achievements.map((achievement) => (
              <div key={achievement.id}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-gray-900">{achievement.title}</h3>
                  {achievement.date && (
                    <span className="creative-date text-sm">{formatDate(achievement.date)}</span>
                  )}
                </div>
                {achievement.description && (
                  <div
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: achievement.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Awards */}
      {resumeData.awards && resumeData.awards.length > 0 && (
        <section className="mb-0">
          <h2 className="creative-section-header">
            Awards & Recognition
          </h2>
          <div className="space-y-3">
            {resumeData.awards.map((award) => (
              <div key={award.id}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-semibold text-gray-900">{award.title}</h3>
                    <p className="text-gray-700 font-medium">{award.issuer}</p>
                  </div>
                  <span className="creative-date text-sm">{formatDate(award.date)}</span>
                </div>
                {award.description && (
                  <div
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: award.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {resumeData.certifications && resumeData.certifications.length > 0 && (
        <section className="mb-0">
          <h2 className="creative-section-header">
            Certifications
          </h2>
          <div className="space-y-3">
            {resumeData.certifications.map((cert) => (
              <div key={cert.id}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-semibold text-gray-900">{cert.name}</h3>
                    <p className="text-gray-700 font-medium">{cert.issuer}</p>
                    {cert.credentialId && <p className="text-gray-600 text-sm">ID: {cert.credentialId}</p>}
                  </div>
                  <div className="text-right text-sm creative-date">
                    <div>{formatDate(cert.date)}</div>
                    {renderExpiry(cert.expiryDate)}
                  </div>
                </div>
                {!isRichTextEmpty(cert.description) && (
                  <div
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: cert.description! }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Publications */}
      {resumeData.publications && resumeData.publications.length > 0 && (
        <section className="mb-0">
          <h2 className="creative-section-header">
            Publications
          </h2>
          <div className="space-y-3">
            {resumeData.publications.map((pub) => (
              <div key={pub.id}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-semibold text-gray-900">{pub.title}</h3>
                    <p className="text-gray-700 font-medium">{pub.journal}</p>
                    {pub.authors && <p className="text-gray-600 text-sm">Authors: {pub.authors}</p>}
                    {publicationLink(pub.link, "text-sm", "p", { color: "#7c3aed" })}
                  </div>
                  <span className="creative-date text-sm">{formatDate(pub.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      </div>
    </div>
  );

  const renderExecutiveTemplate = () => (
    <div className="unified-resume bg-white p-8 text-gray-900 text-sm leading-relaxed">
      {/* Header */}
      <header className="mb-2 bg-gradient-to-r from-gray-900 to-gray-700 text-white p-4 rounded-lg">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold mb-2">
            {resumeData.personalInfo.fullName || "Your Name"}
          </h1>
          {resumeData.personalInfo.photo && (
            <img
              src={resumeData.personalInfo.photo}
              alt="Profile"
              className="w-20 h-20 rounded-lg object-cover border-4 border-white shadow-xl"
            />
          )}
        </div>
        {renderIconContactRow("onDark")}
      </header>

      {/* Executive Summary */}
      {resumeData.personalInfo.summary && (
        <section className="mb-0">
          <h2 className="executive-section-header">
            Executive Summary
          </h2>
          <div 
            className="text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: resumeData.personalInfo.summary }}
          />
        </section>
      )}

      {/* Experience */}
      {resumeData.experience.length > 0 && (
        <section className="mb-0">
          <h2 className="executive-section-header">
            Executive Experience
          </h2>
          <div className="space-y-3">
            {resumeData.experience.map((exp) => (
              <div key={exp.id} >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-bold text-gray-900">{exp.position}</h3>
                    <p className="text-gray-700 font-semibold">{formatPlace(exp.company, exp.location)}</p>
                  </div>
                  <div className="text-right text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDate(exp.startDate)} - {exp.current ? "Present" : formatDate(exp.endDate)}
                      </span>
                    </div>
                  </div>
                </div>
                {exp.description && (
                  <div 
                    className="text-gray-700 leading-relaxed mt-0.5"
                    dangerouslySetInnerHTML={{ __html: exp.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {resumeData.education.length > 0 && (
        <section className="mb-0">
          <h2 className="executive-section-header">
            Education
          </h2>
          <div className="space-y-3">
            {resumeData.education.map((edu) => (
              <div key={edu.id} >
                {renderEducationEntry(edu, {
                  dateSeparator: " - ",
                  degreeClass: "font-bold text-gray-900",
                  placeClass: "text-gray-700",
                  fieldClass: "text-gray-600",
                  scoreClass: "text-gray-600",
                  dateClass: "text-gray-600",
                  showCalendar: true,
                  calendarClass: "w-4 h-4",
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {namedSkills.length > 0 && (
        <section className="mb-0">
          <h2 className="executive-section-header">
            Core Competencies
          </h2>
          {renderPairedSkills(true, "text-gray-700 font-medium", "text-sm text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full")}
        </section>
      )}

      {/* Projects */}
      {resumeData.projects && resumeData.projects.length > 0 && (
        <section className="mb-0">
          <h2 className="executive-section-header">
            Strategic Initiatives
          </h2>
          <div className="space-y-3">
            {resumeData.projects.map((project) => (
              <div key={project.id} >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-gray-900">{project.name}</h3>
                </div>
                {project.technologies && (
                  <p className="text-gray-600 mb-1">
                    <strong>Technologies:</strong> {project.technologies}
                  </p>
                )}
                {project.description && (
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: project.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Achievements */}
      {resumeData.achievements && resumeData.achievements.length > 0 && (
        <section className="mb-0">
          <h2 className="executive-section-header">
            Key Achievements
          </h2>
          <div className="space-y-3">
            {resumeData.achievements.map((achievement) => (
              <div key={achievement.id} >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-gray-900">{achievement.title}</h3>
                  {achievement.date && (
                    <span className="text-gray-600">{formatDate(achievement.date)}</span>
                  )}
                </div>
                {achievement.description && (
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: achievement.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Awards */}
      {resumeData.awards && resumeData.awards.length > 0 && (
        <section className="mb-0">
          <h2 className="executive-section-header">
            Awards & Recognition
          </h2>
          <div className="space-y-3">
            {resumeData.awards.map((award) => (
              <div key={award.id} >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-bold text-gray-900">{award.title}</h3>
                    <p className="text-gray-700 font-semibold">{award.issuer}</p>
                  </div>
                  <span className="text-gray-600">{formatDate(award.date)}</span>
                </div>
                {award.description && (
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: award.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {resumeData.certifications && resumeData.certifications.length > 0 && (
        <section className="mb-0">
          <h2 className="executive-section-header">
            Professional Certifications
          </h2>
          <div className="space-y-3">
            {resumeData.certifications.map((cert) => (
              <div key={cert.id} >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-bold text-gray-900">{cert.name}</h3>
                    <p className="text-gray-700 font-semibold">{cert.issuer}</p>
                    {cert.credentialId && <p className="text-gray-600">ID: {cert.credentialId}</p>}
                  </div>
                  <div className="text-right text-gray-600">
                    <div>{formatDate(cert.date)}</div>
                    {renderExpiry(cert.expiryDate)}
                  </div>
                </div>
                {!isRichTextEmpty(cert.description) && (
                  <div
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: cert.description! }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Publications */}
      {resumeData.publications && resumeData.publications.length > 0 && (
        <section className="mb-0">
          <h2 className="executive-section-header">
            Publications
          </h2>
          <div className="space-y-3">
            {resumeData.publications.map((pub) => (
              <div key={pub.id} >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-bold text-gray-900">{pub.title}</h3>
                    <p className="text-gray-700 font-semibold">{pub.journal}</p>
                    {pub.authors && <p className="text-gray-600">Authors: {pub.authors}</p>}
                    {publicationLink(pub.link, "text-blue-600")}
                  </div>
                  <span className="text-gray-600">{formatDate(pub.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  // Resumake Template 1: Classic Minimalist
  const renderResumakeClassicTemplate = () => (
    <div className="bg-white p-8 min-h-[11in] text-gray-900 text-sm leading-relaxed">
      {/* Header - Centered with small caps name and dot-separated contact info */}
      <header className="text-center mb-2">
        <h1 className="resumake-classic-name">
          {resumeData.personalInfo.fullName || "Your Name"}
        </h1>
        <div className="resumake-classic-contact">
          {linkifyContactLine(formatContactLine(resumeData.personalInfo, "classic"))}
        </div>
      </header>

      {/* Professional Summary */}
      {resumeData.personalInfo.summary && (
        <section className="mb-0 summary-section">
          <h2 className="resumake-classic-section-header">
            Professional Summary
          </h2>
          <hr className="border-0 h-[1px] bg-black my-1" />
          <div 
            className="text-gray-700 leading-tight"
            dangerouslySetInnerHTML={{ __html: resumeData.personalInfo.summary }}
          />
        </section>
      )}

      {/* Experience */}
      {resumeData.experience.length > 0 && (
        <section className="mb-0 experience-section">
          <h2 className="resumake-classic-section-header">
            Professional Experience
          </h2>
          <hr className="border-0 h-[1px] bg-black my-1" />
          <div className="space-y-0 ml-2">
            {resumeData.experience.map((exp) => (
              <div key={exp.id} className="resumake-classic-item">
                <div className="resumake-classic-item-header">
                  <div>
                    <h3 className="resumake-classic-institution">{formatPlace(exp.company, exp.location)}</h3>
                    <p className="resumake-classic-position">{exp.position}</p>
                  </div>
                  <div className="resumake-classic-date">
                    {formatDate(exp.startDate)} - {exp.current ? "Present" : formatDate(exp.endDate)}
                  </div>
                </div>
                {exp.description && (
                  <div className="resumake-classic-item-content">
                    <div dangerouslySetInnerHTML={{ __html: exp.description }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {resumeData.education.length > 0 && (
        <section className="mb-0 education-section">
          <h2 className="resumake-classic-section-header">
            Education
          </h2>
          <hr className="border-0 h-[1px] bg-black my-1" />
          <div className="space-y-0 ml-2">
            {resumeData.education.map((edu) => (
              <div key={edu.id} className="resumake-classic-item">
                {renderEducationEntry(edu, {
                  dateSeparator: " - ",
                  degreeClass: "font-semibold text-[#333333]",
                  placeClass: "text-[#333333]",
                  fieldClass: "text-[#374151]",
                  scoreClass: "text-[#6b7280]",
                  dateClass: "resumake-classic-date",
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {namedSkills.length > 0 && (
        <section className="mb-0 skills-section">
          <h2 className="resumake-classic-section-header">
            Skills
          </h2>
          <hr className="border-0 h-[1px] bg-black my-1" />
          <div className="resumake-classic-skills-grid ml-2">
            {namedSkills.map((skill) => (
              <div key={skill.id} className="resumake-classic-skill-item">
                <span className="resumake-classic-institution">{skill.name}</span>
                <span className="resumake-classic-skill-level">{skill.level}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {resumeData.projects && resumeData.projects.length > 0 && (
        <section className="mb-0 projects-section">
          <h2 className="resumake-classic-section-header">
            Projects
          </h2>
          <hr className="border-0 h-[1px] bg-black my-1" />
          <div className="space-y-0 ml-2">
            {resumeData.projects.map((project) => (
              <div key={project.id} className="resumake-classic-item">
                <div className="resumake-classic-item-header">
                  <div>
                    <h3 className="resumake-classic-institution">{project.name}</h3>
                    {project.technologies && (
                      <p className="resumake-classic-position">{project.technologies}</p>
                    )}
                  </div>
                  {project.date && (
                    <div className="resumake-classic-date">{formatDate(project.date)}</div>
                  )}
                </div>
                {project.description && (
                  <div className="resumake-classic-item-content">
                    <div dangerouslySetInnerHTML={{ __html: project.description }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Achievements */}
      {resumeData.achievements && resumeData.achievements.length > 0 && (
        <section className="mb-0 achievements-section">
          <h2 className="resumake-classic-section-header">
            Achievements
          </h2>
          <hr className="border-0 h-[1px] bg-black my-1" />
          <div className="space-y-0 ml-2">
            {resumeData.achievements.map((achievement) => (
              <div key={achievement.id} className="resumake-classic-item">
                <div className="resumake-classic-item-header">
                  <div>
                    <h3 className="resumake-classic-institution">{achievement.title}</h3>
                  </div>
                  {achievement.date && (
                    <div className="resumake-classic-date">{formatDate(achievement.date)}</div>
                  )}
                </div>
                {achievement.description && (
                  <div className="resumake-classic-item-content">
                    <div dangerouslySetInnerHTML={{ __html: achievement.description }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Awards */}
      {resumeData.awards && resumeData.awards.length > 0 && (
        <section className="mb-0 awards-section">
          <h2 className="resumake-classic-section-header">
            Awards
          </h2>
          <hr className="border-0 h-[1px] bg-black my-1" />
          <div className="space-y-0 ml-2">
            {resumeData.awards.map((award) => (
              <div key={award.id} className="resumake-classic-item">
                <div className="resumake-classic-item-header">
                  <div>
                    <h3 className="resumake-classic-institution">{award.title}</h3>
                    {award.issuer && <p className="resumake-classic-position">{award.issuer}</p>}
                  </div>
                  {award.date && (
                    <div className="resumake-classic-date">{formatDate(award.date)}</div>
                  )}
                </div>
                {award.description && (
                  <div className="resumake-classic-item-content">
                    <div dangerouslySetInnerHTML={{ __html: award.description }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {resumeData.certifications && resumeData.certifications.length > 0 && (
        <section className="mb-0 certifications-section">
          <h2 className="resumake-classic-section-header">
            Certifications
          </h2>
          <hr className="border-0 h-[1px] bg-black my-1" />
          <div className="space-y-0 ml-2">
            {resumeData.certifications.map((cert) => (
              <div key={cert.id} className="resumake-classic-item">
                <div className="resumake-classic-item-header">
                  <div>
                    <h3 className="resumake-classic-institution">{cert.name}</h3>
                    {cert.issuer && <p className="resumake-classic-position">{cert.issuer}</p>}
                  </div>
                  {(cert.date || cert.expiryDate) && (
                    <div className="resumake-classic-date">
                      {cert.date && <div>{formatDate(cert.date)}</div>}
                      {renderExpiry(cert.expiryDate)}
                    </div>
                  )}
                </div>
                {cert.credentialId && (
                  <div className="resumake-classic-item-content">
                    <p className="resumake-classic-location">Credential ID: {cert.credentialId}</p>
                  </div>
                )}
                {!isRichTextEmpty(cert.description) && (
                  <div className="resumake-classic-item-content">
                    <div dangerouslySetInnerHTML={{ __html: cert.description! }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Publications */}
      {resumeData.publications && resumeData.publications.length > 0 && (
        <section className="mb-0 publications-section">
          <h2 className="resumake-classic-section-header">
            Publications
          </h2>
          <hr className="border-0 h-[1px] bg-black my-1" />
          <div className="space-y-0 ml-2">
            {resumeData.publications.map((pub) => (
              <div key={pub.id} className="resumake-classic-item">
                <div className="resumake-classic-item-header">
                  <div>
                    <h3 className="resumake-classic-institution">{pub.title}</h3>
                    {pub.journal && <p className="resumake-classic-position">{pub.journal}</p>}
                    {pub.authors && <p className="resumake-classic-location">Authors: {pub.authors}</p>}
                  </div>
                  {pub.date && (
                    <div className="resumake-classic-date">{formatDate(pub.date)}</div>
                  )}
                </div>
                {pub.link?.trim() && (
                  <div className="resumake-classic-item-content">
                    {publicationLink(pub.link, "text-blue-600")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  const renderResumakeClassicSingleTemplate = () => (
    <div className="bg-white p-8 min-h-[11in] text-gray-900 text-sm leading-relaxed academic-body academic-content">
      {/* Header */}
      <header className="mb-3">
        <div className="flex justify-between items-end">
          <div className="flex-1">
            <h1 className="text-2xl text-black leading-tight academic-name whitespace-nowrap">
              {resumeData.personalInfo.fullName || "Your Name"}
            </h1>
          </div>
          <div className="text-right text-black">
            <div className="text-right">
              {linkifyContactLine(formatContactLine(resumeData.personalInfo, "shaded"))}
            </div>
          </div>
        </div>
      </header>

      {/* Professional Summary */}
      {resumeData.personalInfo.summary && (
        <section className="mb-4">
          <h2 className="academic-shaded-header">
            Professional Summary
          </h2>
          <div>
            <div 
              className="text-black leading-relaxed -ml-2"
              dangerouslySetInnerHTML={{ __html: resumeData.personalInfo.summary }}
            />
          </div>
        </section>
      )}

      {/* Experience */}
      {resumeData.experience.length > 0 && (
        <section className="mb-4">
          <h2 className="academic-shaded-header">
            Experience
          </h2>
          <div className="space-y-3 -ml-2">
            {resumeData.experience.map((exp) => (
              <div key={exp.id} className="experience-item mb-3">
                <div className="flex justify-between items-start mb-0">
                  <div className="flex-1">
                    <h3 className="font-bold text-black">
                      {formatPlace(exp.company, exp.location)}
                    </h3>
                    <p className="font-bold text-black mb-0 ml-1">{exp.position}</p>
                  </div>
                  <div className="text-right text-sm text-black">
                    <div>{formatDateRange(exp.startDate, exp.endDate, exp.current, " | ")}</div>
                  </div>
                </div>
                {exp.description && (
                  <div className="-mt-1">
                    <div 
                      className="text-black leading-relaxed ml-2"
                      dangerouslySetInnerHTML={{ __html: exp.description }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {namedSkills.length > 0 && (
        <section className="mb-0 skills-section">
          <h2 className="academic-shaded-header">
            Skills
          </h2>
          <div className="resumake-classic-skills-grid ml-2">
            {namedSkills.map((skill) => (
              <div key={skill.id} className="resumake-classic-skill-item">
                <span className="resumake-classic-institution">{skill.name}</span>
                <span className="resumake-classic-skill-level">{skill.level}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {resumeData.projects?.length > 0 && (
        <section className="mb-4">
          <h2 className="academic-shaded-header">
            Projects
          </h2>
          <div className="space-y-3 -ml-2">
            {resumeData.projects.map((project) => (
              <div key={project.id} className="project-item mb-3">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1">
                    <h3 className="font-bold text-black">{project.name}</h3>
                  </div>
                  <div className="text-right text-sm text-black">
                    {project.date && <div>{formatDate(project.date)}</div>}
                  </div>
                </div>
                {project.description && (
                  <div className="-mt-1">
                    <div 
                      className="text-black leading-relaxed ml-2"
                      dangerouslySetInnerHTML={{ __html: project.description }}
                    />
                  </div>
                )}
                {project.technologies && (
                  <div className="mt-1 text-sm text-black">
                    <span className="font-bold">Skills:</span> {project.technologies}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {resumeData.education.length > 0 && (
        <section className="mb-2">
          <h2 className="academic-shaded-header">
            Education
          </h2>
          <div className="space-y-0 -ml-2">
            {resumeData.education.map((edu) => (
              <div key={edu.id} className="education-item">
                {renderEducationEntry(edu, {
                  dateSeparator: " | ",
                  degreeClass: "font-semibold text-black",
                  placeClass: "text-black",
                  fieldClass: "text-black",
                  scoreClass: "text-black",
                  dateClass: "text-sm text-black",
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Achievements */}
      {resumeData.achievements && resumeData.achievements.length > 0 && (
        <section className="mb-4">
          <h2 className="academic-shaded-header">
            Achievements
          </h2>
          <div className="space-y-3 -ml-2">
            {resumeData.achievements.map((achievement) => (
              <div key={achievement.id} className="achievement-item mb-3">
                <div className="flex justify-between items-start mb-0">
                  <div className="flex-1">
                    <h3 className="font-bold text-black">{achievement.title}</h3>
                  </div>
                  <div className="text-right text-sm text-black">
                    {achievement.date && <div>{formatDate(achievement.date)}</div>}
                  </div>
                </div>
                {achievement.description && (
                  <div className="-mt-1">
                    <div 
                      className="text-black leading-relaxed ml-2"
                      dangerouslySetInnerHTML={{ __html: achievement.description }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Awards */}
      {resumeData.awards && resumeData.awards.length > 0 && (
        <section className="mb-4">
          <h2 className="academic-shaded-header">
            Awards
          </h2>
          <div className="space-y-3 -ml-2">
            {resumeData.awards.map((award) => (
              <div key={award.id} className="award-item mb-3">
                <div className="flex justify-between items-start mb-0">
                  <div className="flex-1">
                    <h3 className="font-bold text-black">{award.title}</h3>
                  </div>
                  <div className="text-right text-sm text-black">
                    {award.date && <div>{formatDate(award.date)}</div>}
                  </div>
                </div>
                {award.description && (
                  <div className="-mt-1">
                    <div 
                      className="text-black leading-relaxed ml-2"
                      dangerouslySetInnerHTML={{ __html: award.description }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {resumeData.certifications && resumeData.certifications.length > 0 && (
        <section className="mb-4">
          <h2 className="academic-shaded-header">
            Certifications
          </h2>
          <div className="space-y-3 -ml-2">
            {resumeData.certifications.map((cert) => (
              <div key={cert.id} className="certification-item mb-3">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1">
                    <h3 className="font-bold text-black">{cert.name}</h3>
                    {cert.issuer && <p className="italic text-black">{cert.issuer}</p>}
                  </div>
                  <div className="text-right text-sm text-black">
                    {cert.date && <div>{formatDate(cert.date)}</div>}
                    {renderExpiry(cert.expiryDate)}
                  </div>
                </div>
                {cert.credentialId && (
                  <div className="mt-1 text-sm text-black">
                    <span className="font-medium">Credential ID:</span> {cert.credentialId}
                  </div>
                )}
                {!isRichTextEmpty(cert.description) && (
                  <div className="-mt-1">
                    <div
                      className="text-black leading-relaxed ml-2"
                      dangerouslySetInnerHTML={{ __html: cert.description! }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Publications */}
      {resumeData.publications && resumeData.publications.length > 0 && (
        <section className="mb-4">
          <h2 className="academic-shaded-header">
            Publications
          </h2>
          <div className="space-y-1 -ml-2">
            {resumeData.publications.map((pub) => (
              <div key={pub.id} className="publication-item">
                <div className="flex justify-between items-start mb-0">
                  <div className="flex-1">
                    <h3 className="font-bold text-black">{pub.title}</h3>
                    {pub.journal && <p className="italic text-black">{pub.journal}</p>}
                    {pub.authors && <p className="text-sm text-black">Authors: {pub.authors}</p>}
                    {publicationLink(pub.link, "text-sm text-blue-600 -mt-1", "div")}
                  </div>
                  <div className="text-right text-sm text-black">
                    {pub.date && <div>{formatDate(pub.date)}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  const renderSidebarTemplate = () => {
    const info = resumeData.personalInfo;
    const nameWords = (info.fullName || "Your Name").trim().split(/\s+/).filter(Boolean);
    const contactItems: { key: string; Icon: LucideIcon; value: string; href?: string; web?: boolean }[] = [];
    if (info.phone) contactItems.push({ key: "phone", Icon: Phone, value: info.phone });
    if (info.email) contactItems.push({ key: "email", Icon: Mail, value: info.email, href: mailtoHref(info.email) });
    if (info.location) contactItems.push({ key: "location", Icon: MapPin, value: info.location });
    if (info.website) contactItems.push({ key: "website", Icon: Globe, value: CONTACT_WEBSITE_LABEL, href: externalHref(info.website), web: true });
    if (info.linkedin) contactItems.push({ key: "linkedin", Icon: Linkedin, value: CONTACT_LINKEDIN_LABEL, href: externalHref(info.linkedin), web: true });

    const railHeading = (Icon: LucideIcon, label: string) => (
      <h2 className="sidebar-rail-heading">
        <span className="sidebar-rail-icon" aria-hidden>
          <Icon />
        </span>
        <span>{label}</span>
      </h2>
    );

    const mainHeading = (Icon: LucideIcon, label: string) => (
      <h2 className="sidebar-heading">
        <span className="sidebar-heading-icon" aria-hidden>
          <Icon />
        </span>
        <span>{label}</span>
      </h2>
    );

    const rail = (
        <aside className="sidebar-rail order-1" data-sidebar-rail>
          {info.photo && (
            <div className="sidebar-photo" data-sidebar-photo>
              <img src={info.photo} alt="Profile" />
            </div>
          )}

          {contactItems.length > 0 && (
            <section className="sidebar-block">
              {railHeading(Phone, "Contact")}
              <ul className="sidebar-contact">
                {contactItems.map(({ key, Icon, value, href, web }) => (
                  <li key={key}>
                    {web && href ? (
                      <a href={href} className="inline-flex items-center gap-1 text-sky-200 underline">
                        <Icon aria-hidden />
                        {value}
                      </a>
                    ) : (
                      <>
                        <Icon aria-hidden />
                        {renderMaybeLink(value, href)}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {resumeData.education.length > 0 && (
            <section className="sidebar-block">
              {railHeading(GraduationCap, "Education")}
              <div className="sidebar-edu-list">
                {resumeData.education.map((edu) => {
                  const lines = educationEntryLines(edu);
                  const dateText = formatDateRange(edu.startDate, edu.endDate, edu.current, " - ", "Pursuing");
                  return (
                    <div key={edu.id} className="sidebar-edu">
                      {lines.place && <div className="sidebar-edu-place">{lines.place}</div>}
                      {lines.degree && <div>{lines.degree}</div>}
                      {lines.field && <div>{lines.field}</div>}
                      {lines.score && <div>{lines.score}</div>}
                      {dateText && <div className="sidebar-edu-dates">{dateText}</div>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {namedSkills.length > 0 && (
            <section className="sidebar-block">
              {railHeading(LayoutGrid, "Skills")}
              <ul className="sidebar-skills">
                {namedSkills.map((skill) => (
                  <li key={skill.id}>
                    <span>{skill.name}</span>
                    {skill.level.trim() && <span className="sidebar-skill-level">{skill.level}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
    );

    const main = (
        <div className="sidebar-main order-2">
          <h1 className="sidebar-name" data-sidebar-name>
            {nameWords.map((word, index) => (
              <span key={`${word}-${index}`}>{word}</span>
            ))}
          </h1>

          {info.summary && (
            <section className="sidebar-block">
              {mainHeading(User, "About Me")}
              <div className="sidebar-prose" dangerouslySetInnerHTML={{ __html: info.summary }} />
            </section>
          )}

          {resumeData.experience.length > 0 && (
            <section className="sidebar-block">
              {mainHeading(Briefcase, "Experience")}
              <div className="sidebar-timeline" data-sidebar-line>
                {resumeData.experience.map((exp) => (
                  <div key={exp.id} className="sidebar-job">
                    <span className="sidebar-dot" data-sidebar-dot aria-hidden />
                    <div className="sidebar-job-head">
                      <div>
                        <h3 className="sidebar-role" data-sidebar-role>{exp.position}</h3>
                        <p className="sidebar-company">{formatPlace(exp.company, exp.location)}</p>
                      </div>
                      <div className="sidebar-date" data-sidebar-date>
                        {formatDateRange(exp.startDate, exp.endDate, exp.current, " - ")}
                      </div>
                    </div>
                    {exp.description && (
                      <div className="sidebar-prose" dangerouslySetInnerHTML={{ __html: exp.description }} />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {resumeData.projects && resumeData.projects.length > 0 && (
            <section className="sidebar-block">
              {mainHeading(FolderKanban, "Projects")}
              <div className="sidebar-entries">
                {resumeData.projects.map((project) => (
                  <div key={project.id} className="sidebar-entry">
                    <div className="sidebar-job-head">
                      <div>
                        <h3 className="sidebar-role">{project.name}</h3>
                        {project.technologies && <p className="sidebar-company">{project.technologies}</p>}
                      </div>
                      {project.date && <div className="sidebar-date">{formatDate(project.date)}</div>}
                    </div>
                    {project.description && (
                      <div className="sidebar-prose" dangerouslySetInnerHTML={{ __html: project.description }} />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {resumeData.achievements && resumeData.achievements.length > 0 && (
            <section className="sidebar-block">
              {mainHeading(Trophy, "Achievements")}
              <div className="sidebar-entries">
                {resumeData.achievements.map((achievement) => (
                  <div key={achievement.id} className="sidebar-entry">
                    <div className="sidebar-job-head">
                      <h3 className="sidebar-role">{achievement.title}</h3>
                      {achievement.date && <div className="sidebar-date">{formatDate(achievement.date)}</div>}
                    </div>
                    {achievement.description && (
                      <div className="sidebar-prose" dangerouslySetInnerHTML={{ __html: achievement.description }} />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {resumeData.awards && resumeData.awards.length > 0 && (
            <section className="sidebar-block">
              {mainHeading(Award, "Awards")}
              <div className="sidebar-entries">
                {resumeData.awards.map((award) => (
                  <div key={award.id} className="sidebar-entry">
                    <div className="sidebar-job-head">
                      <div>
                        <h3 className="sidebar-role">{award.title}</h3>
                        {award.issuer && <p className="sidebar-company">{award.issuer}</p>}
                      </div>
                      {award.date && <div className="sidebar-date">{formatDate(award.date)}</div>}
                    </div>
                    {award.description && (
                      <div className="sidebar-prose" dangerouslySetInnerHTML={{ __html: award.description }} />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {resumeData.certifications && resumeData.certifications.length > 0 && (
            <section className="sidebar-block">
              {mainHeading(BadgeCheck, "Certifications")}
              <div className="sidebar-entries">
                {resumeData.certifications.map((cert) => (
                  <div key={cert.id} className="sidebar-entry">
                    <div className="sidebar-job-head">
                      <div>
                        <h3 className="sidebar-role">{cert.name}</h3>
                        {cert.issuer && <p className="sidebar-company">{cert.issuer}</p>}
                      </div>
                      {(cert.date || cert.expiryDate) && (
                        <div className="sidebar-date">
                          {cert.date && <div>{formatDate(cert.date)}</div>}
                          {renderExpiry(cert.expiryDate)}
                        </div>
                      )}
                    </div>
                    {cert.credentialId && <p className="sidebar-meta">Credential ID: {cert.credentialId}</p>}
                    {!isRichTextEmpty(cert.description) && (
                      <div className="sidebar-prose" dangerouslySetInnerHTML={{ __html: cert.description! }} />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {resumeData.publications && resumeData.publications.length > 0 && (
            <section className="sidebar-block">
              {mainHeading(BookOpen, "Publications")}
              <div className="sidebar-entries">
                {resumeData.publications.map((pub) => (
                  <div key={pub.id} className="sidebar-entry">
                    <div className="sidebar-job-head">
                      <div>
                        <h3 className="sidebar-role">{pub.title}</h3>
                        {pub.journal && <p className="sidebar-company">{pub.journal}</p>}
                        {pub.authors && <p className="sidebar-meta">Authors: {pub.authors}</p>}
                      </div>
                      {pub.date && <div className="sidebar-date">{formatDate(pub.date)}</div>}
                    </div>
                    {publicationLink(pub.link, "sidebar-link")}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
    );

    return (
      <div className="sidebar-resume">
        <div className="sidebar-print-bar" aria-hidden="true" />
        {main}
        {rail}
      </div>
    );
  };

  const templates = {
    modern: renderModernTemplate,
    classic: renderClassicTemplate,
    minimal: renderMinimalTemplate,
    professional: renderProfessionalTemplate,
    creative: renderCreativeTemplate,
    executive: renderExecutiveTemplate,
    "resumake-classic": renderResumakeClassicTemplate,
    "resumake-classic-single": renderResumakeClassicSingleTemplate,
    sidebar: renderSidebarTemplate,
  };

  const TemplateComponent = templates[template as keyof typeof templates] || renderModernTemplate;

  return (
    <Card className="w-full max-w-4xl mx-auto overflow-hidden">
      <div className="w-full h-fit">
        <div key={template} className="relative">
          <TemplateComponent />
          

        </div>
      </div>
    </Card>
  );
};