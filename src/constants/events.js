const events = {
  SESSION_COMPLETED: 'checkout.session.completed',
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  SUBSCRIPTION_CREATED: 'customer.subscription.created',
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  PAYMENT_FAILED: 'invoice.payment_failed',
  CUSTOMER_CREATED: 'customer.created',
  ACCOUNT_UPDATED: 'account.updated',
};

module.exports = {
  events,
};
