require('dotenv').config();
const { getDb } = require('../config/database');

async function run() {
  try {
    const db = await getDb();
    
    const content_sections = [
      {
        id: 'parties',
        title: '1. Parties',
        order: 1,
        required: true,
        content: `This Video Production Agreement (the "Agreement") is entered into as of {{start_date}} (the "Effective Date"), by and between the following parties:\n\n1.1 Service Provider. {{company_name}}, a company incorporated under the Companies Act, 2013, with CIN U73100UP2025PTC224880 and GSTIN 09AALCK9039M1ZP, having its registered office at {{company_address}} ("Service Provider" or "Company"), represented by {{authorized_signatory}}, its duly authorized signatory.\n\n1.2 Client. {{#if_company}}{{client_display_name}}, {{client_entity_type_phrase}}located at {{client_address}} ("Client"), acting through its authorized signatory, {{client_signatory_name}} ({{client_signatory_title}}), in connection with Client's product "{{project_name}}."{{/if_company}}{{#if_individual}}{{client_name}}, located at {{client_address}} ("Client").{{/if_individual}}`
      },
      {
        id: 'liability_client',
        title: '1.3 No Personal Liability \u2013 Client',
        order: 2,
        required: true,
        condition: 'client_type:company',
        content: `The Client's obligations under this Agreement are obligations solely of {{client_display_name}}. No member, manager, officer, employee, representative, or authorized signatory of {{client_display_name}} \u2014 including {{client_signatory_name}} \u2014 shall have personal liability under this Agreement solely because they sign this Agreement or act on behalf of {{client_display_name}}.`
      },
      {
        id: 'liability_provider',
        title: '1.4 No Personal Liability \u2013 Service Provider',
        order: 3,
        required: true,
        content: `The Service Provider's obligations under this Agreement are obligations solely of {{company_name}}. No director, officer, employee, representative, or authorized signatory of {{company_name}} \u2014 including {{authorized_signatory}} \u2014 shall have personal liability under this Agreement solely because they sign this Agreement or act on behalf of {{company_name}}.`
      },
      {
        id: 'authority',
        title: '1.5 Authority',
        order: 4,
        required: true,
        content: `Each person signing this Agreement represents and warrants that they are duly authorized to execute and deliver this Agreement on behalf of the party identified above and to bind that party to its terms.`
      },
      {
        id: 'definitions',
        title: '2. Definitions',
        order: 5,
        required: true,
        content: `2.1 "Agreement" means this contract, including all schedules, annexes, and written amendments signed by both parties.\n2.2 "Deliverables" means the edited video content, animations, multimedia assets, and other outputs described in Section 3.\n2.3 "Business Day" means a day other than Saturday, Sunday, or a public holiday in {{#if_indian}}India{{/if_indian}}{{#if_foreign}}California or India{{/if_foreign}}.\n2.4 "Client Materials" means text, images, data, screen recordings, logos, product information, credentials, and other materials supplied or authorized by Client.`
      },
      {
        id: 'scope_of_work',
        title: '3. Scope of Work',
        order: 6,
        required: true,
        content: `The Company agrees to perform the following services for the project "{{project_name}}":\n\n{{scope_of_work}}\n\nAny additional features, modifications, or services outside this scope will require a separate written addendum and may incur additional charges.`
      },
      {
        id: 'payment_terms',
        title: '4. Payment Terms',
        order: 7,
        required: true,
        content: `The total compensation for the services described in this Agreement shall be {{currency}} {{total_amount}}.\n\nPayment Structure:\n{{payment_terms_section}}\n\nStandard Terms: All advance payments must be made within three (3) Business Days of signing this Agreement. Following the realization of the advance payment, a one-week preparation period shall commence before active development/service begins.`
      },
      {
        id: 'timeline',
        title: '5. Term and Timeline',
        order: 8,
        required: true,
        content: `5.1 The Agreement begins on the Effective Date. Active project work is expected to commence on or about {{active_start_date}}, after receipt of the first payment and required Client Materials.\n\n5.2 The initial service term is {{timeline}}, ending {{end_date}} (the "Initial Term"). Unless terminated, the Agreement will continue on a month-to-month basis after the Initial Term.\n\n5.3 Service Provider shall use commercially reasonable efforts to complete the Section 3 Deliverables during the Initial Term, subject to Client's timely cooperation and the approved production schedule. The Company shall not be held liable for delays caused by the Client's failure to provide required materials or approvals.`
      },
      {
        id: 'termination',
        title: '6. Termination & Breach',
        order: 9,
        required: true,
        content: `6.1 Termination for Convenience. Either party may terminate this Agreement by providing thirty (30) days' written notice.\n\n6.2 Termination for Cause. Either party may terminate this Agreement immediately upon written notice if the other party breaches any material term and fails to cure such breach within fourteen (14) days of receiving notice.\n\n6.3 Effect of Termination. Upon termination, the Client shall pay the Company for all work performed and expenses incurred up to the effective date of termination.`
      },
      {
        id: 'ip_rights',
        title: '7. Intellectual Property',
        order: 10,
        required: true,
        content: `7.1 Client Ownership. Upon payment of the applicable fee, Service Provider assigns to Client all right, title, and interest in the final custom video content, animations, scripts, and multimedia deliverables created specifically for Client and delivered under this Agreement, excluding Service Provider Materials defined below.\n\n7.2 Service Provider Materials. Service Provider retains ownership of pre-existing code, libraries, templates, workflows, know-how, and proprietary tools used to create the Deliverables ("Service Provider Materials"). To the extent Service Provider Materials are embedded in a final Deliverable, Service Provider grants Client a perpetual, worldwide, non-exclusive, royalty-free, transferable license to use, reproduce, display, distribute, modify, and exploit those Service Provider Materials solely as part of or in connection with the final Deliverable.\n\n7.3 Third-Party Materials. Service Provider shall identify any third-party materials, stock assets, software, fonts, music, voice talent, or AI tools that impose material usage restrictions or additional fees. Service Provider shall obtain required licenses for materials it selects and uses, unless Client expressly directs otherwise in writing.`
      },
      {
        id: 'confidentiality',
        title: '8. Confidentiality',
        order: 11,
        required: true,
        content: `Each party shall protect the other party's confidential information using at least reasonable care and shall use it only to perform or receive services under this Agreement. Confidential information does not include information that is publicly available through no breach, already lawfully known, independently developed without use of confidential information, or lawfully received from a third party. These obligations survive termination for three (3) years, except trade secrets shall be protected for so long as they remain trade secrets under applicable law.`
      },
      {
        id: 'ai_tools',
        title: '9. AI Tools, Likeness, Voice, and Data',
        order: 12,
        required: true,
        content: `9.1 Service Provider shall not create, publish, distribute, license, or use any AI-generated avatar, voice clone, likeness, or synthetic representation of Client, its founder, personnel, customers, or representatives without Client's prior written approval of the specific representation and intended use.\n\n9.2 Service Provider shall not use Client's likeness, voice, name, confidential information, Client Materials, or Deliverables to train an AI model or for any purpose outside this Agreement without Client's separate prior written consent.\n\n9.3 Service Provider shall use commercially reasonable measures to ensure that AI platforms and third-party providers used for the project do not receive rights to use Client Materials or personal likeness beyond what is necessary to provide the services. Upon Client's written request, Service Provider shall identify the material AI platforms used in producing a Deliverable.\n\n9.4 Client may reject any AI-generated representation that is inaccurate, misleading, or inconsistent with Client's brand. Service Provider shall promptly replace or revise a rejected representation within the scope of the Agreement.`
      },
      {
        id: 'warranties',
        title: '10. Representations and Warranties',
        order: 13,
        required: true,
        content: `10.1 Service Provider warrants that the services will be performed in a professional and workmanlike manner consistent with generally applicable industry standards.\n\n10.2 Service Provider warrants that it has the authority to enter into this Agreement and that, except for Client Materials and approved third-party materials, the Deliverables will not knowingly infringe or misappropriate a third party's intellectual-property rights.\n\n10.3 Client warrants that it owns or has obtained the necessary rights and licenses for Client Materials supplied to Service Provider for inclusion in the Deliverables.`
      },
      {
        id: 'indemnification',
        title: '11. Mutual Indemnification',
        order: 14,
        required: true,
        content: `11.1 Service Provider Indemnification. Service Provider shall defend, indemnify, and hold harmless Client and its {{#if_company}}members, managers, officers, employees, agents, successors, and assigns{{/if_company}}{{#if_individual}}heirs, successors, and assigns{{/if_individual}} from and against third-party claims, damages, liabilities, losses, judgments, settlements, costs, and reasonable attorneys' fees arising out of or relating to: (a) Service Provider's breach of this Agreement; (b) Service Provider's negligence, gross negligence, willful misconduct, or violation of applicable law; (c) an allegation that the services, Deliverables, or materials created or selected by Service Provider infringe or misappropriate a third party's intellectual-property or proprietary rights; or (d) Service Provider's unauthorized use, disclosure, or processing of Client information, likeness, voice, data, or confidential information.\n\n11.2 Client Indemnification. Client shall defend, indemnify, and hold harmless Service Provider and its directors (including {{authorized_signatory}}), officers, employees, and agents from and against third-party claims, damages, liabilities, losses, judgments, settlements, costs, and reasonable attorneys' fees arising out of or relating to: (a) Client's breach of this Agreement; (b) Client Materials that Client did not have the right to provide or authorize for use; (c) Client's negligence, gross negligence, willful misconduct, or violation of applicable law; or (d) Client's modification, unauthorized distribution, or use of the Deliverables.\n\n11.3 Procedure. The indemnified party shall promptly notify the indemnifying party of a claim, provided that delay in notice relieves the indemnifying party only to the extent materially prejudiced. The indemnifying party shall control the defense with counsel reasonably acceptable to the indemnified party. No settlement may admit liability by, impose obligations on, or require payment by the indemnified party without its prior written consent.\n\n11.4 Exclusions. Neither party shall indemnify the other to the extent a claim results from the indemnified party's negligence, willful misconduct, breach of this Agreement, or unauthorized use of applicable materials or Deliverables.`
      },
      {
        id: 'limitation_liability',
        title: '12. Limitation of Liability',
        order: 15,
        required: true,
        content: `To the maximum extent permitted by applicable law, neither party shall be liable for indirect, incidental, special, exemplary, consequential, or punitive damages, or loss of profits, data, or business opportunities. Except for payment obligations, confidentiality breaches, intellectual-property infringement or misuse, unauthorized use of likeness or voice, indemnification obligations, fraud, gross negligence, or willful misconduct, each party's aggregate liability under this Agreement shall not exceed the fees paid or payable under this Agreement during the three (3) months preceding the event giving rise to the claim.`
      },
      {
        id: 'force_majeure',
        title: '13. Force Majeure',
        order: 16,
        required: true,
        content: `Neither party shall be liable for failure or delay caused by circumstances beyond its reasonable control, including natural disasters, pandemics, government actions, strikes, internet outages, or other unforeseeable events, provided the affected party promptly notifies the other and uses reasonable efforts to resume performance.`
      },
      {
        id: 'dispute_resolution',
        title: '14. Governing Law and Dispute Resolution',
        order: 17,
        required: true,
        content: `{{#if_indian}}This Agreement shall be governed by and construed in accordance with the laws of India. Any dispute arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the competent courts in Ghaziabad, Uttar Pradesh, India.{{/if_indian}}{{#if_foreign}}14.1 Governing Law. This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict-of-laws rules.\n\n14.2 Good-Faith Discussions. Before commencing arbitration, the parties shall attempt in good faith to resolve any dispute through discussions between authorized representatives. If the dispute is not resolved within sixty (60) days after written notice describing the dispute, either party may proceed to arbitration under Section 14.3.\n\n14.3 Binding Arbitration. Any dispute arising out of or relating to this Agreement that is not resolved under Section 14.2 shall be finally resolved by binding arbitration conducted in the English language before a single arbitrator, via video conference or other remote means, in accordance with rules mutually agreed by the parties or, absent agreement, the rules of a recognized international arbitration institution. The arbitrator's award shall be final and binding on both parties and may be entered as a judgment in any court of competent jurisdiction. Each party shall bear its own costs of arbitration unless the arbitrator determines otherwise.\n\n14.4 Injunctive Relief. Notwithstanding Sections 14.2 and 14.3, either party may seek temporary, preliminary, or permanent injunctive relief in a court of competent jurisdiction to protect confidential information, intellectual property, likeness, voice, or other rights for which monetary damages would be inadequate.{{/if_foreign}}`
      },
      {
        id: 'general_provisions',
        title: '15. General Provisions',
        order: 18,
        required: true,
        content: `15.1 Entire Agreement. This Agreement constitutes the entire agreement between the parties regarding its subject matter and supersedes all prior or contemporaneous understandings, whether oral or written.\n\n15.2 Amendments. Any amendment or waiver must be in writing and signed by authorized representatives of both parties.\n\n15.3 Assignment. {{#if_company}}Client may assign this Agreement to an affiliate or successor in connection with a merger, reorganization, or sale of substantially all of its assets. Neither party may otherwise assign this Agreement without the other party's prior written consent, not to be unreasonably withheld.{{/if_company}}{{#if_individual}}Neither party may assign this Agreement without the other party's prior written consent, not to be unreasonably withheld.{{/if_individual}}\n\n15.4 Independent Contractors. The parties are independent contractors. Nothing creates a partnership, joint venture, employment, fiduciary, or agency relationship.\n\n15.5 Notices. Notices must be in writing and delivered by email with confirmation of receipt, nationally recognized courier, or personal delivery to the addresses set out in Section 1, or to any updated address designated in writing.\n\n15.6 Severability. If any provision is held invalid or unenforceable, it shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall remain in effect.\n\n15.7 Counterparts and Electronic Signatures. This Agreement may be executed in counterparts and by electronic signature, each of which is deemed an original and together constitute one instrument.`
      },
      {
        id: 'signatures',
        title: '16. Signatures',
        order: 19,
        required: true,
        content: `The parties have executed this Agreement through their duly authorized representatives as of the Effective Date.\n\n<div style="margin-top: 30px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">\n<div style="flex: 1; min-width: 240px;">\n<strong>SERVICE PROVIDER:</strong><br>\n<strong>{{company_name}}</strong><br><br>\nSignature: ___________________________<br><br>\nName: {{authorized_signatory}}<br>\nTitle: Director / Authorized Signatory\n</div>\n<div style="flex: 1; min-width: 240px;">\n<strong>CLIENT:</strong><br>\n{{#if_company}}\n<strong>{{client_name}}</strong><br><br>\nSignature: ___________________________<br><br>\nName: {{client_signatory_name}}<br>\nTitle: Authorized Signatory\n{{/if_company}}\n{{#if_individual}}\n<strong>{{client_name}}</strong><br><br>\nSignature: ___________________________<br><br>\nName: {{client_name}}\n{{/if_individual}}\n</div>\n</div>`
      }
    ];

    const contentSectionsJson = JSON.stringify(content_sections);

    await db.run(
      'UPDATE templates SET content_sections = ? WHERE id = ?',
      [contentSectionsJson, 4]
    );

    console.log('Successfully updated content_sections for template ID 4');
    process.exit(0);
  } catch (error) {
    console.error('Error updating template:', error);
    process.exit(1);
  }
}

run();
