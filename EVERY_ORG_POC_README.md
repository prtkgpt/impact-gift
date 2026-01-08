# Every.org Integration - Proof of Concept

## 🚀 Quick Start

### Option 1: Open Directly in Browser
```bash
# From the project root
open every-org-poc.html
# OR
xdg-open every-org-poc.html  # Linux
# OR
start every-org-poc.html     # Windows
```

### Option 2: Serve with HTTP Server
```bash
# Using Python
python3 -m http.server 8080

# Then visit: http://localhost:8080/every-org-poc.html
```

---

## ✅ What to Test

### 1. **Nonprofit Search**
- [ ] Type "wildlife" in the search box
- [ ] Type "education" in the search box
- [ ] Type "medical" in the search box
- [ ] Search responds within 1-2 seconds
- [ ] Results show nonprofit logos, names, categories
- [ ] Can see EIN numbers for verification

**Expected Results:**
- Real-time search with ~500ms delay
- 5-20 results per search
- Logos load properly
- Accurate nonprofit information

### 2. **Donation Widget**
- [ ] Click on any nonprofit from search results
- [ ] Widget loads in the right panel
- [ ] Widget shows "Donate to [Nonprofit Name]" button
- [ ] Click the donate button
- [ ] Modal/iframe opens with donation form
- [ ] Form shows multiple payment options
- [ ] Can enter donation amount
- [ ] Can select frequency (one-time, monthly)

**Expected Results:**
- Widget loads within 2-3 seconds
- Clean, professional UI
- No page redirects (stays on your site)
- Supports: Credit/Debit, Bank, PayPal, Venmo, Crypto, Stocks

### 3. **User Experience**
- [ ] Donors never leave the page
- [ ] Modal can be closed/reopened
- [ ] Responsive design works on mobile
- [ ] No payment processing on your end
- [ ] Professional branding

---

## 📊 POC Metrics to Track

The page tracks:
1. **Searches Made** - How many times you searched
2. **Results Found** - Total nonprofits discovered
3. **Nonprofits Selected** - How many you clicked on

---

## 🔍 Key Observations to Make

### Technical Validation

**✓ API Performance**
- Search latency: < 1 second?
- Results accuracy: Relevant nonprofits?
- Error handling: Graceful fallbacks?

**✓ Widget Integration**
- Easy to embed? (Yes - just one script tag)
- Customizable? (Colors, amounts, payment methods)
- Mobile-friendly? (Test on phone)

**✓ Donor Experience**
- Stays on your platform? (Modal, not redirect)
- Professional UI? (Matches modern expectations)
- Clear donation flow? (Easy to complete)

### Business Validation

**✓ vs. Current Implementation**
| Feature | Current (Stripe) | Every.org |
|---------|------------------|-----------|
| Charities Available | 8 manual | 1.5M+ searchable |
| Payment Methods | Card only | Card, Bank, PayPal, Venmo, Crypto, Stocks, DAF |
| Platform Liability | High | Zero |
| Transaction Fees | ~2.9% + 30¢ | Free |
| Tax Receipts | Manual | Automatic |
| Corporate Matching | Manual tracking | Built-in |

---

## 🐛 Known Limitations in POC

1. **API Key Required for Production**
   - POC uses public endpoints (may hit rate limits)
   - Get free key: https://www.every.org/charity-api

2. **No Webhook Testing**
   - Can't test donation notifications in standalone HTML
   - Need backend integration for webhooks

3. **Simplified Error Handling**
   - Production needs retry logic
   - Better user feedback on failures

---

## 💡 Next Steps After Testing

### If POC Looks Good ✅

**Immediate Actions:**
1. Get Every.org API key (free, takes 5 minutes)
2. Test with API key for rate limits
3. Review webhook documentation
4. Plan integration timeline

**Integration Plan:**
```
Week 1: Backend
- Add charity search endpoint
- Update database schema
- Add webhook listener

Week 2: Frontend
- Create CharitySearch component
- Replace DonationMethodSelector
- Test end-to-end

Week 3: Migration
- Remove Stripe integration
- Update documentation
- Deploy to production
```

### If POC Needs More Testing ❓

**Additional Tests:**
1. Test on mobile devices
2. Test with different nonprofits (small/large)
3. Test payment flow end-to-end (small test donation)
4. Review Every.org terms of service
5. Check nonprofit verification process

---

## 📚 Resources

### Every.org Documentation
- **Main API Docs:** https://docs.every.org
- **Search API:** https://docs.every.org/docs/endpoints/nonprofit-search
- **Donate Button:** https://docs.every.org/docs/donate-button
- **Webhooks:** https://docs.every.org/docs/webhooks/partner-webhook
- **Get API Key:** https://www.every.org/charity-api

### GitHub Examples
- **Donate Button:** https://github.com/everydotorg/donate-button
- **Search Example:** https://github.com/everydotorg/example-nonprofit-search-app

### Support
- **Email:** partners@every.org
- **Documentation:** https://docs.every.org
- **Status:** https://status.every.org

---

## ✨ POC Success Criteria

Check these boxes to determine if Every.org is right for your platform:

### Must-Have ✅
- [ ] Search finds relevant nonprofits quickly
- [ ] Widget loads and displays correctly
- [ ] Donation flow is smooth (no redirects)
- [ ] Supports credit card donations minimum
- [ ] Zero platform liability for payments
- [ ] Free to use (no transaction fees)

### Nice-to-Have 🎁
- [ ] Supports PayPal/Venmo (corporate matching)
- [ ] Supports crypto donations
- [ ] Automatic tax receipts
- [ ] Built-in corporate matching
- [ ] 1.5M+ nonprofit database
- [ ] Professional UI/branding

### Deal-Breakers ❌
- [ ] Search is too slow (> 3 seconds)
- [ ] Widget doesn't load properly
- [ ] Donation flow redirects away from site
- [ ] Limited nonprofit selection
- [ ] Poor mobile experience

---

## 🎯 Final Decision Framework

### Recommend Every.org Integration if:
1. POC widget loads successfully
2. Search performance is acceptable
3. Donor experience is professional
4. API documentation is clear
5. No major technical blockers

### Recommend Further Research if:
1. Widget has loading issues
2. Search is unreliable
3. Limited nonprofit coverage
4. API has major limitations
5. Terms of service concerns

### Recommend Sticking with Current Approach if:
1. Every.org doesn't work at all
2. Platform is too restrictive
3. Nonprofit verification issues
4. Business model doesn't fit
5. Technical integration too complex

---

## 📝 Notes

Take notes while testing:

**What worked well:**
-

**What didn't work:**
-

**Questions for Every.org:**
-

**Integration concerns:**
-

**Timeline estimate:**
-

---

## 🤝 Questions or Issues?

If you encounter any problems with the POC:

1. Check browser console for errors
2. Try different nonprofits
3. Test in different browsers
4. Review API documentation
5. Contact Every.org support

Good luck testing! 🚀
