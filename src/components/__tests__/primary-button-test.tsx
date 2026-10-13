import { fireEvent, render } from '@testing-library/react-native';

import { PrimaryButton } from '../ui';

describe('PrimaryButton', () => {
  it('llama a onPress al pulsar', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<PrimaryButton title="Empezar" onPress={onPress} />);

    fireEvent.press(getByText('Empezar'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no llama a onPress cuando está deshabilitado', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<PrimaryButton title="Empezar" onPress={onPress} disabled />);

    fireEvent.press(getByText('Empezar'));

    expect(onPress).not.toHaveBeenCalled();
  });
});
